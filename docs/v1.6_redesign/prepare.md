# prepare the app for easy redesign

## Goal
- as little change needed throughout the app to apply a new theme/style
- all design classes should be in /shared/ui

## Manually found classes that should be own component (as per coding-conventions skill styling rule 4)
- "tabs" and "tab"
- span tags should be a Typography or Text component (font-size, text-align,...)
- "label" 
- "flex" can be a Flex component
- "table" (and other classes bound to table. th, tr, td)
- a "paper" component consisting of border and padding styling
- "dropdown-content" and "menu"
- button with icon as child (icon button)
- "grid" and grid related classes ("grid-cols-2", "col-span-2), make Grid, Col, and Row their own components
- "fieldset" and "fieldset-legend" (what's different between fieldset-legend and "label"?)
- "rounded-field" (I see it for input type = color)
- "divider"

these is by far a comprehensive list of classes that could be moved to a component so changing styles stays confined to shared/ui
