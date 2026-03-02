/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint } from 'lucide-react';

interface BiometricScanOverlayProps {
  isOpen: boolean;
  onComplete?: () => void;
}

const BiometricScanOverlay: React.FC<BiometricScanOverlayProps> = ({ isOpen, onComplete }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex cursor-wait flex-col items-center justify-center bg-[#0d0500] p-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

          <motion.div
            className="absolute z-20 h-1 w-full bg-[#ffbf00] shadow-[0_0_20px_#ffbf00]"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />

          <div className="relative z-10 flex flex-col items-center gap-8 text-center">
            <Fingerprint className="h-24 w-24 animate-pulse text-[#ffbf00]" />
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-black uppercase tracking-tighter text-white md:text-4xl">
                Analyzing Biometrics
              </h2>
              <p className="animate-pulse font-mono text-xs uppercase tracking-[0.4em] text-[#ffbf00] md:text-sm">
                Synchronizing Neural Drive...
              </p>
            </div>

            <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-[#ffbf00] to-[#ff4000]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.5, ease: 'easeInOut', onComplete: onComplete }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BiometricScanOverlay;
