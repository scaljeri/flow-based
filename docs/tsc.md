* use generics for querySelector:

    el.querySelector<HTMLInputElememt>('input.action')'
    
 * tsconfig.json (compilerOptions)
    * strictNullChecks to 'true' - if something can be null typescript will warn you
      if still sure it can't be null use ! as: `textEl!.value`
    * force typings add `noImplicitAny` to tsconfig.json  
 * disable tslint for a file: `tslint:disable`
 
