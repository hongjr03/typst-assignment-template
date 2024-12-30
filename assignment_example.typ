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

+ 引入 `numbly` 包，支持中文样式的标题编号
+ 引入 `zebraw` 包，支持代码块高亮
+ 引入 `frame-it` 包，支持自定义背景色的块
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

*此处对于块的使用较原来的模版有所改变，请勿混用。*

模版使用 frame-it 包预定义了 prob 和 qna 两种块，分别用于问题和问答。使用方法如下：

```typ
#prob[问题描述][
  问题的回答
]
```

#prob[问题描述][
  问题的回答
]

```typ
#qna[问题描述][
  问题的回答
]
```

#qna[问题描述][
  问题的回答
]

如果不需要问题的描述，可以直接使用：

```typ
#prob[][
  问题的回答
]
```

#prob[][
  问题的回答
]

== 代码块

模板使用 zebraw 包预定义了代码块，支持高亮。使用方法如下：

````typ
#zebraw(
  highlight-lines: (3, 4, 5, 6),
  ```cpp
  #include <iostream>
  using namespace std;
  int main() {
    cout << "Hello, World!" << endl;
    return 0;
  }
  ```
)
````

#zebraw(
  highlight-lines: (3, 4, 5, 6),
  ```cpp
  #include <iostream>
  using namespace std;
  int main() {
    cout << "Hello, World!" << endl;
    return 0;
  }
  ```
)

== 自定义

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