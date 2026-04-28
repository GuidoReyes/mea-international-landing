"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X } from "lucide-react"
import Image from "next/image"

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Cursos", href: "#cursos" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Testimonios", href: "#testimonios" },
  { label: "FAQ", href: "#faq" },
]

const Navbar1 = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="flex justify-center w-full py-4 px-4 fixed top-0 z-50">
      <motion.div
        className={`flex items-center justify-between px-6 py-3 rounded-full w-full max-w-4xl relative transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg shadow-[#0A2540]/10 border border-slate-100"
            : "bg-white shadow-md"
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center"
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.2 }}
        >
          <Image
            src="/mea logo.svg"
            alt="MEA International"
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <a
                href={item.href}
                className="text-sm text-slate-600 hover:text-[#0A2540] transition-colors font-medium"
              >
                {item.label}
              </a>
            </motion.div>
          ))}
        </nav>

        {/* Desktop CTA Button */}
        <motion.div
          className="hidden md:block"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
        >
          <a
            href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm text-white bg-[#00C4B4] rounded-full hover:bg-[#00a898] transition-colors font-semibold shadow-md shadow-[#00C4B4]/30"
          >
            Inscríbete Ahora
          </a>
        </motion.div>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden flex items-center p-2 rounded-full hover:bg-slate-100"
          onClick={toggleMenu}
          whileTap={{ scale: 0.9 }}
        >
          <Menu className="h-5 w-5 text-[#0A2540]" />
        </motion.button>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-white z-50 pt-20 px-6 md:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <X className="h-5 w-5 text-[#0A2540]" />
            </motion.button>

            <div className="flex items-center mb-10">
              <Image
                src="/mea logo.svg"
                alt="MEA International"
                width={130}
                height={44}
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="flex flex-col space-y-6">
              {navLinks.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <a
                    href={item.href}
                    className="text-xl text-[#0A2540] font-medium hover:text-[#00C4B4] transition-colors"
                    onClick={toggleMenu}
                  >
                    {item.label}
                  </a>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                exit={{ opacity: 0, y: 20 }}
                className="pt-6 border-t border-slate-100"
              >
                <a
                  href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                  className="inline-flex items-center justify-center w-full px-5 py-4 text-base text-white bg-[#00C4B4] rounded-full hover:bg-[#00a898] transition-colors font-semibold"
                  onClick={toggleMenu}
                >
                  Inscríbete Ahora
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Navbar1 }
