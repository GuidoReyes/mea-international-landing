/**
 * Pruebas de seguridad del backup y de Drive (tarea 480).
 * No usa MySQL ni Google: prueba las funciones puras y el archivo de opciones temporal.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-backup-security.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import {
  buildBackupListQuery,
  escapeDriveQueryValue,
  isBackupFileName,
  isValidDriveId,
  requireDriveId,
} from "../lib/drive-utils";
import { buildDefaultsFileContent, buildDumpArgs, createDefaultsFile, escapeOptionValue } from "../backup/dumper";
import { parseServiceAccountJson } from "../backup/drive-auth";
import { selectFilesToDelete } from "../backup/cleaner";
import { stripControlChars } from "../lib/log-sanitize";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

const FOLDER_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const DB = { user: "mea_user", password: 'p"a\\ss#x', host: "db.internal", port: "3306", database: "mea" };

// ── Drive: escape e IDs ──────────────────────────────────────────────────────

check("escapeDriveQueryValue escapa comillas simples", () => {
  assert.equal(escapeDriveQueryValue("O'Brien"), "O\\'Brien");
});

check("escapeDriveQueryValue escapa barras invertidas", () => {
  assert.equal(escapeDriveQueryValue("a\\b"), "a\\\\b");
});

check("escapeDriveQueryValue: una barra final no se come la comilla de cierre", () => {
  const query = `name = '${escapeDriveQueryValue("Perez\\")}'`;
  assert.equal(query, "name = 'Perez\\\\'");
});

check("escapeDriveQueryValue neutraliza una inyección con comillas", () => {
  const escaped = escapeDriveQueryValue("' OR '1'='1");
  assert.equal(escaped, "\\' OR \\'1\\'=\\'1");
  assert.equal(/(^|[^\\])'/.test(escaped), false); // ninguna comilla queda sin escapar
});

check("escapeDriveQueryValue: escapa la barra antes que la comilla", () => {
  assert.equal(escapeDriveQueryValue("\\'"), "\\\\\\'");
});

check("isValidDriveId acepta un ID real y rechaza caracteres de inyección", () => {
  assert.equal(isValidDriveId(FOLDER_ID), true);
  assert.equal(isValidDriveId("abc' or 'x'='x"), false);
  assert.equal(isValidDriveId("corto"), false);
  assert.equal(isValidDriveId("a".repeat(51)), false);
  assert.equal(isValidDriveId(""), false);
});

check("requireDriveId lanza con el nombre de la variable y no devuelve el valor inválido", () => {
  assert.equal(requireDriveId(FOLDER_ID, "X"), FOLDER_ID);
  assert.throws(() => requireDriveId("mal id", "GOOGLE_DRIVE_BACKUP_FOLDER_ID"), /GOOGLE_DRIVE_BACKUP_FOLDER_ID/);
  try {
    requireDriveId("secreto con espacio", "X");
  } catch (err) {
    assert.equal(String(err).includes("secreto con espacio"), false);
  }
});

check("buildBackupListQuery con carpeta: filtra por padre y descarta la papelera", () => {
  const query = buildBackupListQuery(FOLDER_ID);
  assert.ok(query.includes(`'${FOLDER_ID}' in parents`));
  assert.ok(query.includes("trashed = false"));
});

check("buildBackupListQuery sin carpeta NUNCA lista toda la cuenta (filtra por tipo)", () => {
  const query = buildBackupListQuery(undefined);
  assert.notEqual(query.trim(), "trashed = false");
  assert.ok(query.includes("mimeType = 'application/gzip'"));
});

check("isBackupFileName solo acepta archivos .sql.gz", () => {
  assert.equal(isBackupFileName("mea_2026-09-20T02-00-00.sql.gz"), true);
  assert.equal(isBackupFileName("boleta-123.pdf"), false);
  assert.equal(isBackupFileName("Pagos con depósito"), false);
  assert.equal(isBackupFileName("x.sql.gz.pdf"), false);
  assert.equal(isBackupFileName(""), false);
});

check("buildBackupListQuery rechaza un ID de carpeta inválido", () => {
  assert.throws(() => buildBackupListQuery("x' or trashed = false or 'y'='y"), /GOOGLE_DRIVE_BACKUP_FOLDER_ID/);
});

// ── mysqldump: la contraseña no viaja en los argumentos ──────────────────────

check("buildDumpArgs no incluye la contraseña y usa --defaults-extra-file primero", () => {
  const args = buildDumpArgs("/tmp/x/client.cnf", "mea");
  assert.equal(args[0], "--defaults-extra-file=/tmp/x/client.cnf");
  assert.equal(args.some((a) => a.includes("p\"a")), false);
  assert.equal(args.some((a) => a.startsWith("-p")), false);
  assert.equal(args[args.length - 1], "mea");
});

check("escapeOptionValue escapa barra, comilla y saltos de línea", () => {
  assert.equal(escapeOptionValue('a"b'), 'a\\"b');
  assert.equal(escapeOptionValue("a\\b"), "a\\\\b");
  assert.equal(escapeOptionValue("a\nb"), "a\\nb");
  assert.equal(escapeOptionValue("a\rb"), "a\\rb");
});

check("buildDefaultsFileContent arma la sección [client] con la contraseña entre comillas", () => {
  const content = buildDefaultsFileContent(DB);
  assert.ok(content.startsWith("[client]"));
  assert.ok(content.includes("user=mea_user"));
  assert.ok(content.includes("host=db.internal"));
  assert.ok(content.includes("port=3306"));
  assert.ok(content.includes('password="p\\"a\\\\ss#x"'));
});

check("createDefaultsFile crea un archivo 0600 y cleanup lo borra", () => {
  const { filePath, cleanup } = createDefaultsFile(DB);
  try {
    assert.ok(fs.existsSync(filePath));
    assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
    assert.ok(fs.readFileSync(filePath, "utf8").includes("[client]"));
  } finally {
    cleanup();
  }
  assert.equal(fs.existsSync(filePath), false);
  assert.equal(fs.existsSync(path.dirname(filePath)), false);
});

// ── drive-auth ────────────────────────────────────────────────────────────────

check("parseServiceAccountJson: JSON inválido da un error claro sin volcar el contenido", () => {
  try {
    parseServiceAccountJson("{no es json con private_key=SECRETO");
    assert.fail("debía lanzar");
  } catch (err) {
    assert.ok(String(err).includes("GOOGLE_SERVICE_ACCOUNT_JSON"));
    assert.equal(String(err).includes("SECRETO"), false);
  }
});

check("parseServiceAccountJson: exige client_email y private_key", () => {
  assert.throws(() => parseServiceAccountJson("{}"), /client_email/);
  assert.throws(() => parseServiceAccountJson('{"client_email":"a@b.c"}'), /private_key/);
  assert.throws(() => parseServiceAccountJson("[]"), /objeto/);
});

check("parseServiceAccountJson: acepta credenciales completas", () => {
  const out = parseServiceAccountJson('{"client_email":"a@b.c","private_key":"k","project_id":"p"}');
  assert.equal(out.client_email, "a@b.c");
});

// ── cleaner ───────────────────────────────────────────────────────────────────

check("selectFilesToDelete conserva los N más recientes", () => {
  const files = [{ name: "a", mtime: 1 }, { name: "b", mtime: 3 }, { name: "c", mtime: 2 }, { name: "d", mtime: 4 }];
  const doomed = selectFilesToDelete(files, 2).map((f) => f.name);
  assert.deepEqual(doomed.sort(), ["a", "c"]);
});

check("selectFilesToDelete no borra nada si hay menos archivos que el tope", () => {
  assert.deepEqual(selectFilesToDelete([{ name: "a", mtime: 1 }], 3), []);
});

check("selectFilesToDelete con un tope inválido no borra todo", () => {
  const files = [{ name: "a", mtime: 1 }, { name: "b", mtime: 2 }];
  assert.deepEqual(selectFilesToDelete(files, Number.NaN), []);
  assert.deepEqual(selectFilesToDelete(files, 0), []);
  assert.deepEqual(selectFilesToDelete(files, -1), []);
});

// ── scheduler: log sin caracteres de control ─────────────────────────────────

check("stripControlChars elimina saltos de línea y caracteres de control", () => {
  assert.equal(stripControlChars("0 2 * * *\n[ERROR] falso\r x"), "0 2 * * *[ERROR] falsox");
});

check("stripControlChars deja intacto un cron normal", () => {
  assert.equal(stripControlChars("0 2 * * *"), "0 2 * * *");
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
