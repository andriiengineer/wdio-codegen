# Security policy

## Reporting a vulnerability

**Please do not report security issues through public GitHub issues.**

Report them privately: open the **Security** tab of this repository and use **Report a
vulnerability**. The report stays private between you and the maintainer until a fix is published.

Please include:

- what the issue is, and which file or command it affects;
- steps to reproduce, ideally with a minimal page or recording;
- what an attacker gains; the impact matters more than the mechanism.

You will get a first reply within a few business days: an acknowledgement, a fix or an explanation
of why it is not a vulnerability, and credit in the release notes unless you prefer otherwise.

## Supported versions

Only the latest published version receives fixes.

## Scope

`wdio-codegen` is pointed at untrusted websites by design, so a recorded page getting its own code
executed on the tester's machine is a vulnerability, as is any bypass of the token that guards the
local server.

Behaviour that is intended and documented (recorded values written into the spec as literals, and
the permissions granted to the page during recording) is described in the
[Privacy section of the README](README.md#privacy) and is not a vulnerability. Suggestions to
change it are welcome as feature requests.

The code window holds a loopback CDP port while it is open; web content cannot reach it, since
Chrome refuses DevTools connections originating from a page. A way for a page to reach that port,
or any path from it to the recorded browser session, is in scope and worth reporting.
