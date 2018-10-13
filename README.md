## Flow based programming

Although a lot is still changing and very buggy, the current state can be seen [here](https://scaljeri.github.io/flow-based/) 

Angular library for building workflows + demo 

### Create project specific component

    $>  ng g c foo --project=flow-based
    
### Deploy to gh-pages

  $>  ng build --prod --base-href "https://scaljeri.github.io/flow-based/"
  $>  ngh
  
TODO: Fix circular dependency issues
    
![Example](images/fbp.jpg)

![Example](images/gauss.jpg)

## Resources

   * https://www.youtube.com/watch?v=WjJdaDXN5Vs&index=4&list=LLRfaN_LmYUHepKKDWAjV9nw
   * https://app.flowhub.io/#project/138d806e-2b18-4cb5-961b-d7148258deeb/d13c397f-02e0-4d96-859c-abfe268d8bad
   * Nice article: https://colab.coop/blog/how-to-start-flowing-with-flow-based-programming/
   * Bezier demo: https://stackblitz.com/edit/angular-bezier-curves
   * Audio: http://webaudiodemos.appspot.com/
   * Gauss/charts: https://stackblitz.com/edit/google-charts?file=app%2Fgraph%2Fgraph.component.ts

## POCs

  * https://stackblitz.com/edit/flow-based-programming
  * https://stackblitz.com/edit/angular-bezier-curves

### TODO
  * Refactor sockets setup
  * Put all z-indices in a $variable
