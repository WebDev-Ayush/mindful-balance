import { motion } from 'framer-motion';
import { Brain, Shield } from 'lucide-react';
import { PrivacyBadge } from './PrivacyBadge';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full py-6 px-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-2xl gradient-calm flex items-center justify-center shadow-glow"
          >
            <Brain className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-foreground">MindGuard</h1>
            <p className="text-xs text-muted-foreground">Privacy-First Stress Monitoring</p>
          </div>
        </div>

        <PrivacyBadge variant="compact" />
      </div>
    </motion.header>
  );
}

