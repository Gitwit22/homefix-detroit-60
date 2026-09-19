export type WeightedOption<T> = { value: T; weight: number };

export function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return function random(): number {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function weightedChoice<T>(random: () => number, options: WeightedOption<T>[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let cursor = random() * total;
  for (const option of options) {
    cursor -= option.weight;
    if (cursor < 0) return option.value;
  }
  return options[options.length - 1]!.value;
}

export function randomInteger(random: () => number, minimum: number, maximum: number): number {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

export function shuffle<T>(random: () => number, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInteger(random, 0, index);
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}
