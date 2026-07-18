# Task ID: 131

**Title:** Add live class link to Plan Profesional features

**Status:** done

**Dependencies:** 130 ✓

**Priority:** low

**Description:** Update components/planes/PricingPlanes.tsx to make "Clases en vivo" feature clickable linking to /clases-en-vivo

**Details:**

Update `components/planes/PricingPlanes.tsx` to detect and link the live class feature:

Find the feature list rendering (around line 56):

```typescript
<ul className="space-y-3 mb-8">
  {plan.features.map((feature) => {
    const esClaseEnVivo = feature.toLowerCase().includes("clases en vivo");
    
    return (
      <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
        <Check className="w-4 h-4 text-[#00C4B4] mt-0.5 shrink-0" />
        {esClaseEnVivo ? (
          <Link href="/clases-en-vivo" className="hover:text-[#00C4B4] hover:underline transition">
            {feature}
          </Link>
        ) : (
          <span>{feature}</span>
        )}
      </li>
    );
  })}
</ul>
```

Import Link from next/link at the top if not already imported.

This makes the "Clases en vivo ilimitadas" feature in Plan Profesional clickable, directing users to see the schedule and understand what they get.

**Test Strategy:**

Visit /planes page, find Plan Profesional card, verify "Clases en vivo ilimitadas" feature is now a clickable link (underlines on hover), click it and confirm it navigates to /clases-en-vivo page. Verify other features remain as plain text.
