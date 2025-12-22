# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - generic [ref=e10]:
      - text: Compiling
      - generic [ref=e11]:
        - generic [ref=e12]: .
        - generic [ref=e13]: .
        - generic [ref=e14]: .
  - alert [ref=e15]
  - main [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]:
        - button [ref=e19]:
          - img [ref=e20]
        - heading "Create Quiz" [level=1] [ref=e22]
      - paragraph [ref=e29]: "Step 1: Basic Info"
    - generic [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e33]: Quiz Title *
        - textbox "Enter quiz title" [ref=e35]
        - paragraph [ref=e36]: 0/100 characters
      - generic [ref=e37]:
        - generic [ref=e38]: Description (optional)
        - textbox "Describe your quiz..." [ref=e39]
        - paragraph [ref=e40]: 0/500 characters
    - button "Continue" [disabled] [ref=e43]
```