'use client';

export default function ProgressIndicator({ step }) {
  const steps = ['email', 'account', 'verify'];

  const stepMap = {
    email: 'email',
    password: 'account',
    signup: 'account',
    verify: 'verify',
    forgot: 'account',
  };

  const current = stepMap[step] || 'email';

  const currentIndex = steps.indexOf(current);

  return (
    <div className="flex justify-center space-x-2 mb-6">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${
            i <= currentIndex ? 'bg-primary' : 'bg-muted dark:bg-neutral-700'
          }`}
        />
      ))}
    </div>
  );
}
