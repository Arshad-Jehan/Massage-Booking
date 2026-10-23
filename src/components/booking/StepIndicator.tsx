import { Check } from 'lucide-react';

interface Props {
  steps: { key: string; label: string }[];
  current: number;
  onJump: (index: number) => void;
}

export function StepIndicator({ steps, current, onJump }: Props) {
  return (
    <ol className="steps" aria-label="Booking progress">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={step.key} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <button type="button" disabled={state === 'todo'} onClick={() => onJump(i)}>
              <span className="step-dot">{state === 'done' ? <Check /> : i + 1}</span>
              <span className="step-label">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
