# Prepare the app for easy redesign

## Goal
- as little change needed throughout the app to apply a new theme/style
- all design classes should be in /shared/ui
- keep in mind daisyUI way of styling


## Manually found classes that should be own component (as per coding-conventions skill styling rule 4)
- "tabs" and "tab"
- span tags should be a Typography or Text component (font-size, text-align,...)
- "label" 
- "flex" can be a Flex component
- "table" (and other classes bound to table. th, tr, td)
- a "paper" component consisting of border and padding styling
- "dropdown-content" and "menu"
- button with icon as child (icon button)
- "grid" and grid related classes ("grid-cols-2", "col-span-2)
- "fieldset" and "fieldset-legend" (what's different between fieldset-legend and "label"?)
- "rounded-field" (I see it for input type = color)
- "divider"
- "skeleton" (there is LoadingSkeletonComponent but only used for lists)

these is by far a comprehensive list of classes that could be moved to a component so changing styles stays confined to shared/ui

find all other instances of styling applied to components that are not positional related.


## Design ideas

### Feelings
- Playful
- Curious
- Premium
- Insightful
- Delightful
- Approachable

### Terms
- Dashboard-first UX (the overview is the primary experience)
- Information Visualization (make the charts the hero)
- Visual Hierarchy (make important insights immediately obvious)
- Data Storytelling (turn raw numbers into narratives)

### Styles
- Bento Box Grid → layout foundation
- Swiss Modernism 2.0 → typography, spacing, hierarchy
- Gradient Mesh / Aurora Evolved → vibrant accents and graph colors
- Dimensional Layering → depth without clutter
- Motion-Driven → animated charts and transitions
- Aurora UI → soft lighting and atmosphere
- Vibrant & Block-based → category identity through color
- Dark Mode (OLED) → optional theme where colorful data really stands out