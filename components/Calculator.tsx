import React, { useState } from 'react';
import { ICONS, TRANSLATIONS } from '../constants';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: number;
  language: 'ru' | 'en';
}

const Calculator: React.FC<CalculatorProps> = ({ isOpen, onClose, initialValue = 0, language }) => {
  const [display, setDisplay] = useState(initialValue > 0 ? initialValue.toString() : '0');
  const [expression, setExpression] = useState('');
  const [isResult, setIsResult] = useState(false);
  
  const t = TRANSLATIONS[language];

  // Update display if initialValue changes and we are not in middle of calc
  React.useEffect(() => {
    if (initialValue > 0 && !expression) {
       setDisplay(initialValue.toString());
    }
  }, [initialValue, expression]);

  if (!isOpen) return null;

  const handlePress = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setExpression('');
      setIsResult(false);
    } else if (val === '=') {
      try {
        // Safety check for evaluation
        // eslint-disable-next-line no-eval
        const res = eval(expression + display); 
        setDisplay(String(res));
        setExpression('');
        setIsResult(true);
      } catch (e) {
        setDisplay('Error');
      }
    } else if (['+', '-', '*', '/'].includes(val)) {
      setExpression(display + val);
      setIsResult(false);
      setDisplay('0');
    } else {
      if (display === '0' || isResult) {
        setDisplay(val);
        setIsResult(false);
      } else {
        setDisplay(display + val);
      }
    }
  };

  const buttons = [
    'C', '(', ')', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '=',
  ];

  return (
    <div className="fixed bottom-4 right-4 md:bottom-10 md:right-10 w-72 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
      <div className="flex justify-between items-center p-3 bg-white/10 border-b border-white/10">
        <div className="flex items-center gap-2 text-white/80 font-medium">
          <ICONS.Calculator size={16} /> {t.calculator}
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <ICONS.X size={18} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-2 text-right text-xs text-white/50 h-4">{expression}</div>
        <div className="mb-4 text-right text-3xl font-bold text-white tracking-wider truncate">
          {display}
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={() => handlePress(btn)}
              className={`
                h-10 rounded-lg font-medium transition-all active:scale-95
                ${btn === '=' 
                  ? 'col-span-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30' 
                  : ['C', '/', '*', '-', '+'].includes(btn)
                    ? 'bg-white/10 text-blue-300 hover:bg-white/20'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }
              `}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calculator;