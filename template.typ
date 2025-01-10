#import "@preview/numbly:0.1.0": numbly
#import "@preview/zebraw:0.1.0": *
#import "@preview/frame-it:1.0.0": *

#let default_font = (
  main: "IBM Plex Sans",
  mono: "IBM Plex Mono",
  cjk: "Noto Serif SC",
  emph-cjk: "KaiTi",
  math: "IBM Plex Math",
  math-cjk: "Noto Serif SC",
)

#let (prob,) = make-frames(
  "prob",
  prob: ("问题",),
)

#let (qna,) = make-frames(
  "qna",
  qna: ("问答", yellow),
)

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
  show raw: set text(font: (font.mono, font.cjk))
  show raw.where(block: false): set text(baseline: -1pt)
  show: zebraw.with()

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