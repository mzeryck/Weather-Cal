# Contributing
I created Weather Cal because I wanted to see if it was possible to build a widget layout engine on top of Scriptable's already excellent widget APIs. I honestly never expected anyone to contribute, and so I am grateful to those who have. I'm documenting the guidelines for the base branch, which are the ones I follow in my own code. I know this may be a bit overboard for a small project, but I'm using this as a chance to learn and practice these project maintenance skills.

## When to open a pull request
Bug fixes and tweaks or additions to existing features are always welcome. For new features, consider what a broad audience would find useful. I would love to see forks with more esoteric or niche widget items, but I'd like to keep the base branch not too cluttered. 

For any pull request, please follow the conventions listed below and try to match the existing style.

## Conventions
* Indent using two spaces.
* Add spaces in lists and between operators for readability.
* Variables use camelCase and describe their purpose in descriptive but concise English.
* Functions have some predefined naming conventions, like the `setup` prefix for data setup functions. Functions that provide an asset begin with `provide`, and functions that use a DrawContext begin with `draw`.
* Comments use the following formats:
```javascript
/* 
 * SECTION HEADER
 * Short description of section.
 * =============================
 */
     
// ITEM SETTINGS HEADER
// ====================

// Briefly describe what key pieces of code are doing.
```
* Use comments to clearly explain what code is doing. It's better to over-explain than to under-explain.
* Prioritize readbility and explainability in general. If a single line of code is too convoluted, or if it's impossible to explain in a concise comment, consider changing it. For example, rather than adding several ternary operators into one huge string concatenation, create well-named individual constants and concatenate them at the end.
* Keep the number of settings minimal. Instead of always offering a setting, make good choices on behalf of the user. And when a setting is exposed, make it powerful. For example, the single `showCalendarColor` setting for events determines not only whether calendar colors are shown, but also how they are displayed.
