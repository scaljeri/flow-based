export function deepClone(obj = {}) {
  const newObj = {};

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const property = obj[key],
        type = typeof property;
      switch (type) {
        case 'object':
          if (Object.prototype.toString.call(property) === '[object Array]') {
            newObj[key] = [];
            for (const item of property) {
              newObj[key].push(this.deepclone(item));
            }
          } else {
            newObj[key] = deepClone(property);
          }
          break;
        default:
          newObj[key] = property;
          break;

      }
    }
    return newObj;
  } else {
    return obj;
  }
}
