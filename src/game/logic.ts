export type Feedback = { plus: number; minus: number };

export function generateSecret(digits: number): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let secret = '';
  for (let i = 0; i < digits; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const digit = pool[index];
    // İlk basamak 0 olamaz
    if (i === 0 && digit === '0') {
      i--;
      continue;
    }
    secret += digit;
    pool.splice(index, 1);
  }
  return secret;
}

export function validateGuess(guess: string, digits: number): string | null {
  if (!/^\d+$/.test(guess) || guess.length !== digits) {
    return `${digits} haneli bir sayı gir`;
  }
  if (new Set(guess).size !== digits) {
    return 'Rakamlar birbirinden farklı olmalı';
  }
  return null;
}

// plus: doğru rakam doğru yer, minus: doğru rakam yanlış yer
export function evaluateGuess(secret: string, guess: string): Feedback {
  let plus = 0;
  let minus = 0;
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) plus++;
    else if (secret.includes(guess[i])) minus++;
  }
  return { plus, minus };
}

export function formatFeedback({ plus, minus }: Feedback): string {
  return `+${plus} -${minus}`;
}
