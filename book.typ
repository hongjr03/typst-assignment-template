
#import "@preview/shiroa:0.1.2": *

#show: book

#book-meta(
  title: "typst-assignment-template",
  summary: [
    #prefix-chapter("main.typ")[example]
  ]
)

#build-meta(dest-dir: "docs")

#get-book-meta()

// re-export page template
#import "/templates/page.typ": project
#let book-page = project
