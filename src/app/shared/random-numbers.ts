export function RandomNumberFactory(config = {}) {
  const clonedConfig = Object.assign({}, config);

  return new RandomNumbers(clonedConfig);

}

class RandomNumbers {
  constructor(private config) {
  }
}
