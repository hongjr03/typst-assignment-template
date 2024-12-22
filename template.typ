#import "@preview/numbly:0.1.0": numbly

#let default_font = (
  main: "IBM Plex Sans",
  mono: "IBM Plex Mono",
  cjk: "Noto Serif CJK SC",
  emph-cjk: "KaiTi",
  math: "IBM Plex Math",
  math-cjk: "Noto Serif CJK SC",
)

#let problem_counter = counter("problem")
#let prob-solution_counter = counter("prob-solution")

/// 创建一个块。
/// 由于这个块的样式只有问题使用，所以叫它 `prob_block`。
/// #example(`prob_block[这是一个块。]`, scale-preview: 100%)
/// - body (content): 块的内容。
/// -> content
#let prob_block(body) = {
  block(
    fill: rgb(253, 255, 253),
    width: 100%,
    inset: 8pt,
    radius: 8pt,
    stroke: (paint: rgb(51, 199, 51)),
    body,
  )
}

/// 创建一个特殊块。
/// #example(`speci_block[这是特殊块的标题。][这是特殊块的内容。]`, scale-preview: 100%)
/// - title (content): 块的标题。
/// - body (content): 块的内容。
/// - color (color): 块的边框和标题栏颜色。默认为 `rgb("#1f84c7")`。
/// -> content
#let speci_block(title, body, color: rgb("#1f84c7")) = {
  block(
    fill: color,
    width: 100%,
    inset: (left: 8pt, top: 6pt, bottom: 6pt),
    radius: (top: 8pt, bottom: 0pt),
    stroke: color,
    sticky: true,
  )[
    #set heading(numbering: none)

    #set text(fill: white)
    ==== #title
  ]
  v(0em, weak: true)
  block(
    fill: rgb("#fcfdff"),
    width: 100%,
    inset: 8pt,
    radius: (top: 0pt, bottom: 8pt),
    stroke: color,
    body,
  )
}

/// 创建一个有问题描述的块。
/// #example(`prob[这是一个问题的描述。][这是问题的解答。]`, scale-preview: 100%)
/// - text (content): 问题。
/// - body (content): 问题的解答。问题的解答可以为空，如下面的例子：
///     #example(`prob[这是一个没有解答的问题。][]`, scale-preview: 100%)
///   或者，也可以是一个空的块：
///     #example(`prob[这是一个没有解答的问题。][ ]`, scale-preview: 100%)
/// -> content
#let prob(text, body) = {
  v(0.25em)
  block(sticky: true)[
    #set heading(numbering: none)
    === #text
  ]
  if body == [] {
    v(0.5em)
  } else {
    v(-0.5em)
    prob_block(body)
  }
}

/// 创建一个有编号的问题描述块。
/// #example(`cprob[这是一个问题的描述。][这是问题的解答。]`, scale-preview: 100%)
/// 有编号的问题描述块会自动编号，如下一个例子会变成“问题 2”：
/// #example(`cprob[这是一个问题的描述。][这是问题的解答。]`, scale-preview: 100%)
/// - text (content): 问题。
/// - body (content): 问题的解答。
/// -> content
#let cprob(text, body) = {
  v(0.25em)
  block(sticky: true)[
    #set heading(numbering: none)
    #problem_counter.step()
    === 问题 #context{problem_counter.display()}：#text
  ]
  if body == [] or body == [ ] {
    v(0.5em)
  } else {
    v(-0.5em)
    prob_block(body)
  }
}

/// 创建一个自动编号的带问题的特殊块。
/// #example(`cqa[这是一个问题。][这是特殊块的内容。]`, scale-preview: 100%)
/// - title (content): 特殊块的问题。
/// - body (content): 特殊块的内容。
/// - color (color): 特殊块的背景色。默认为 `rgb("#1f84c7")`。
/// -> content
#let cqa(title, body, color: rgb("#1f84c7")) = {
  v(0.25em)
  [
    #set heading(numbering: none)
    #prob-solution_counter.step()
    === 问题 #context{prob-solution_counter.display()}：#title
  ]
  if body == [] or body == [ ] {
    v(0.5em)
  } else {
    v(-0.5em)
    speci_block([解决方式], body, color: color)
  }
}


#let prox = [#math.op("prox")]
#let proj = [#math.op("proj")]
#let argmin = [#math.arg] + [#math.min]


/// 模板的核心类，规范了文档的格式。
/// - size (length): 字体大小。默认为 `10.5pt`。
/// - title (string): 文档的标题。
/// - author (string): 作者。
/// - course (string): 课程名。
/// - professor_name (string): 教师名。
/// - semester (string): 学期。
/// - due_time (datetime): 截止时间。
/// - id (string): 学号。
/// - font (object): 字体。默认为 `default_font`。如果你想使用不同的字体，可以传入一个字典，包含 `main`、`mono`、`cjk`、`math` 和 `math-cjk` 字段。
/// - lang (string): 语言。默认为 `zh`。
/// - region (string): 地区。默认为 `cn`。
/// - body (content): 文档的内容。
/// -> content
#let assignment_class(
  size: 10.5pt,
  title: none,
  author: none,
  course: none,
  professor_name: none,
  semester: none,
  due_time: none,
  id: none,
  font: default_font,
  lang: "zh",
  region: "cn",
  body,
) = {

  /// 设置字体。
  set text(font: (font.main, font.cjk), size: size, lang: lang, region: region)
  show emph: text.with(font:(font.main, font.emph-cjk))
  let cjk-markers = regex("[“”‘’．，。、？！：；（）｛｝［］〔〕〖〗《》〈〉「」【】『』─—＿·…\u{30FC}]+")
  show cjk-markers: set text(font: font.cjk)
  show raw: it => {
    show cjk-markers: set text(font: font.cjk)
    it
  }
  show math.equation: it => {
    set text(font: font.math)
    show regex("\p{script=Han}"): set text(font: font.math-cjk)
    show cjk-markers: set text(font: font.math-cjk)
    it
  }

  /// 设置标题样式。
  show heading: it => {
    show h.where(amount: 0.3em): none
    it
  }
  show heading: set block(spacing: 1.2em)
  set heading(
    numbering: numbly(
      "{1:一}、",
      "{2:1}. ",
      "{2:1}.{3}. ",
    ),
  )

  /// 设置代码块样式。
  set raw(tab-size: 4)
  show raw: set text(font: (font.mono, font.cjk))
  show raw.where(block: false): box.with(fill: luma(240), inset: (x: 3pt, y: 0pt), outset: (y: 3pt), radius: 2pt)
  // https://github.com/typst/typst/issues/344#issuecomment-2041231063
  let style-number(number) = text(gray)[#number]
  show raw.where(block: true): it => block(
    fill: luma(240),
    inset: 10pt,
    radius: 4pt,
    width: 100%,
  )[
    #set par(justify: false)
    #grid(columns: (auto, 1fr), align: (
        right,
        left,
      ), column-gutter: 0.7em, row-gutter: 0.6em, ..it.lines.enumerate().map(((i, line)) => (
        style-number(i + 1),
        line,
      )).flatten())]

  /// 设置链接样式。
  show link: it => {
    set text(fill: blue)
    underline(it)
  }

  /// 设置列表样式。
  set list(indent: 6pt)
  set enum(indent: 6pt)
  set enum(
    numbering: numbly(
      "{1:1}.",
      "{2:1})",
      "{3:a}.",
    ),
    full: true,
  )

  /// 设置引用样式。
  set bibliography(title: [参考], style: "ieee")

  set document(title: title, author: author)
  set page(
    paper: "a4",
    header: context {
      if counter(page).get().first() == 1 {
        none
      } else {
        [
          #course
          #h(1fr)
          #author | #title
        ]
      }
    },
    footer: context {
      let page_number = counter(page).get().first()
      let total_pages = counter(page).final().last()
      align(center)[
        #set text(size: 8pt)
        #page_number / #total_pages
      ]
    },
  )

  let make_header(name, step: 0.1pt) = (
    context {
      let height = measure(heading(depth: 1, "")).height / 0.6
      let textsize = measure(heading(depth: 1, "")).height / 0.6
      let size = measure(block(text(textsize)[#name]))
      while size.height > height {
        textsize = textsize - step
        size = measure(block(text(textsize)[#name]))
      }
      return {
        block(text(textsize)[#name])
        v(0.2em)
      }
    }
  )



  let comma = if lang == "zh" {
    "，"
  } else {
    ","
  }

  let info_display = if due_time == none or due_time == "" {
    [#author #id] + h(1fr) + [#professor_name] + comma + [#semester]
  } else {
    [#author #id] + h(1fr) + [#professor_name] + comma + [#semester] + [ | #due_time.display("[year]年[month padding:none]月[day padding:none]日")]
  }


  line(length: 100%)
  make_header[*#course* | *#title*]
  info_display
  line(length: 100%)

  body
}