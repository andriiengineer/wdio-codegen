# Third-party notices

The published `wdio-codegen` package ships a pre-built web UI at `ui/assets/`. The libraries
below are compiled into that bundle, so their code is distributed as part of this package and
their copyright notices are reproduced here. Every one of them is under the MIT license.

## Bundled libraries

| Package | Version | Copyright |
|---|---|---|
| react | 18.3.1 | Copyright (c) Facebook, Inc. and its affiliates. |
| react-dom | 18.3.1 | Copyright (c) Facebook, Inc. and its affiliates. |
| scheduler | 0.23.2 | Copyright (c) Facebook, Inc. and its affiliates. |
| @babel/runtime | 7.29.7 | Copyright (c) 2014-present Sebastian McKenzie and other contributors |
| @codemirror/autocomplete | 6.20.3 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/commands | 6.10.4 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/lang-javascript | 6.2.5 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/language | 6.12.4 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/lint | 6.9.7 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/search | 6.7.1 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/state | 6.7.1 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/theme-one-dark | 6.1.3 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @codemirror/view | 6.43.7 | Copyright (C) 2018-2021 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @lezer/common | 1.5.2 | Copyright (C) 2018 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @lezer/highlight | 1.2.3 | Copyright (C) 2018 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @lezer/javascript | 1.5.4 | Copyright (C) 2018 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @lezer/lr | 1.4.10 | Copyright (C) 2018 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @marijn/find-cluster-break | 1.0.3 | Copyright (C) 2024 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; |
| crelt | 1.0.7 | Copyright (C) 2020 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; |
| style-mod | 4.1.3 | Copyright (C) 2018 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| w3c-keyname | 2.2.8 | Copyright (C) 2016 by Marijn Haverbeke &lt;marijn@haverbeke.berlin&gt; and others |
| @uiw/react-codemirror | 4.25.11 | Copyright (c) uiwjs (kenny wong &lt;wowohoo@qq.com&gt;) |
| @uiw/codemirror-extensions-basic-setup | 4.25.11 | Copyright (c) uiwjs (kenny wong &lt;wowohoo@qq.com&gt;) |

The two `@uiw/*` packages declare `"license": "MIT"` in their `package.json` but ship no LICENSE
file; the attribution above is taken from their package metadata.

## MIT License

All of the above are distributed under the following terms:

```
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Browsers fetched at runtime

`wdio-codegen` does not bundle a browser. WebdriverIO downloads Google Chrome for Testing and a
matching chromedriver directly from Google onto the user's machine on first run. Those binaries
are covered by Google's own terms; nothing is redistributed by this package.
