#import "template.typ": *

// ----------------参数----------------
#show: assignment_class.with(
  title: "An Example Assignment",
  author: "张三",
  course: "Typst 5.011",
  professor_name: "老师",
  semester: "2024 夏",
  due_time: datetime(day: 11, month: 5, year: 2024),
  id: "17113945",
)

// ----------------正文----------------
= 快速开始

要开始使用此模板，你需要

+ 安装必须的字体包，包括：

  - #link("https://github.com/IBM/plex")[*IBM Plex Sans, Mono, Math*]
  - #link("https://github.com/notofonts/noto-cjk")[*Noto Serif CJK SC*]

+ 下载 `template.typ` 并在你的文档开头中使用 ```typ
   #import "template.typ": *
   ``` 来导入模板；

+ 在文档开头设置参数，包括标题、作者、课程名、教师名、学期、截止时间和学号；
  ```typ
  #show: assignment_class.with(
    title: "An Example Assignment", // 标题
    author: "张三", // 作者
    course: "Typst 5.011", // 课程名
    professor_name: "老师", // 教师名
    semester: "2024 夏", // 学期
    due_time: datetime(day: 11, month: 5, year: 2024), // 截止时间
    id: "17113945", // 学号
  )
  ```
+ 开始写作！

= 特性

本模板基于 #link("https://github.com/gRox167/typst-assignment-template")[gRox167 的 typst-assignment-template] 修改，缝合了许多作者喜欢的特性，包括：

+ 自动编号的问题块
+ 自定义标题的特殊块
+ 引入 `numbly` 包，支持中文样式的标题编号
+ 美观整洁的排版

= 使用<使用>

== 导入和配置

首先先在开头导入模板：

```typ
#import "template.typ": *
```

在文档的开头设置参数：

```typ
#show: assignment_class.with(
  title: "An Example Assignment",
  author: "张三",
  course: "Typst 5.011",
  professor_name: "老师",
  semester: "2024 夏",
  due_time: datetime(day: 11, month: 5, year: 2024),
  id: "17113945",
)
```
接下来即可开始写作。

== 正文

在正文部分，你可以按照格式自由组合问题块、特殊块、问题和解答块。

=== 问题块

#prob[如何使用问题块来创建问题？][
  你可以使用 `prob` 块来创建问题。
]

#prob[如果有连续的问题，如何处理？][
  你可以使用 `cprob` 块来创建问题。例如：

  ```typ
  #cprob[这是一个问题][
    这是问题的内容。
  ]
  ```

  会生成一个带编号的问题块。请看下面的例子。
]

#cprob[这是一个问题][
  这是问题的内容。
]

#cprob[这是另一个问题][
  这是另一个问题的内容。
]

有编号的问题块会自动编号。你可以通过下面这一行代码重置问题计数器，使下一个问题从 1 开始编号。

```typ
#problem_counter.update(0) // 重置问题计数器
```

#problem_counter.update(0) // 重置问题计数器

#cprob[这是一个新的问题][
  这是新问题的内容。编号已经重置为 1。
]

=== 特殊块

特殊块允许你自定义标题、内容和背景色。在我去年的作业中，一般使用特殊块来作为“问题-解答”块以和作业的解答区分开。比如下面的例子。

#speci_block[如何使用特殊块？][
  你可以使用 `speci_block` 块来创建特殊块。
]

#cqa[这是一个问题和解答块][
  这是问题和解答块的内容。
]

同样的，你可以通过下面这一行代码重置问题和解答计数器，使下一个问题从 1 开始编号。

```typ
#prob-solution_counter.update(0) // 重置问题和解答计数器
```

#prob-solution_counter.update(0) // 重置问题和解答计数器

#cqa[这是一个新的问题和解答块][
  这是新问题和解答块的内容。编号已经重置为 1。
]

== 自定义

=== 更多自定义

如果你需要更多的自定义，你可以在 `template.typ` 中自定义 `prob`、`cprob`、`cqa`、`prob_block`、`speci_block` 函数，以满足你的需求。

=== 标题编号

可以在文档设置参数后使用 `numbly` 包设置标题编号样式：

```typ
#set heading(
  numbering: numbly(
    "{1:一}、",
    "{2:1}. ",
    "{2:1}.{3}. ",
  ),
)
```

参数中，`{*:1}` 的 `*` 代表标题的级别，`1` 代表标题的格式。`{1:一}、` 代表一级标题的格式为 `一、`，`{2:1}. ` 代表二级标题的格式为 `1. `，`{2:1}.{3}. ` 代表三级标题的格式为 `1.1. `。

*注意*，本模板默认去除了标题 numbering 后的空格，所以在设置标题编号时请注意空格的使用。如 `"{2:1}. "` 的末尾有一个空格，这样在标题编号后会有一个空格。

=== 字体

先在终端 / 命令行输入 ```bash typst fonts``` 查看当前可用的字体，以在文档开头加入 `font` 参数修改字体设置以及使用的字体：

```typ
#let font = (
  main: "IBM Plex Sans",
  mono: "IBM Plex Mono",
  cjk: "Noto Serif SC",
  emph-cjk: "KaiTi",
  math: "IBM Plex Math",
  math-cjk: "Noto Serif SC",
)

#show: assignment_class.with(
  // ... 保持原有的参数
  font: font,
)
```

= 参数说明

#{
  show raw.where(block: true): it => {
    set text(size: 10.5pt)
    grid(..it.lines.enumerate().map(((i, line)) => (line,)).flatten())
  }
  set heading(numbering: none)

  import "@preview/tidy:0.3.0"
  import "template.typ"

  let docs = tidy.parse-module(
    read("template.typ"),
    scope: (
      template: template,
    ),
    preamble: "import template: *;",
  )
  tidy.show-module(
    docs,
    first-heading-level: 1,
    show-module-name: true,
    show-outline: false,
    local-names: (parameters: "参数", default: "默认值"),
  )
}