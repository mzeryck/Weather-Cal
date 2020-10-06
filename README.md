# Weather Cal
This is a Scriptable widget that allows you to display, position, and format multiple elements, including the date, a greeting, your upcoming events, the current weather, and future weather. You can even create your own elements by writing a function that has a single WidgetStack as an argument (representing a column).

## How to set it up
You'll need to make a couple edits to the weather-cal.js file before you start. You can edit on your computer and transfer to iOS, or just edit in Scriptable itself.

1. Get a [free OpenWeather API key](http://openweathermap.org/api). Paste the key into `apiKey = ""` between the quotation marks. Note that it may take a few hours for the key to work.
2. Make any other adjustments to the widget settings at the top of the file. 
3. Run the script. It should prompt you for your location and (if enabled) your background photo. At the end, it will show a preview of the widget.
4. Add a Scriptable widget to your home screen and select the script. That's it!

Want a transparent widget? Use [my transparent widget script](https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9) first. At the end of that script, select "Export to Photos", and then use the photo in the Weather Cal setup.

## How it works
To make your layout, find the `LAYOUT` section header. You'll see two areas with lists of items: one for the left column, one for the right column. You can add and remove items from each list. Don't make changes to other parts of the code in this area (except for the column width). And, make sure every item ends with a comma, like this:

```
left,
date,

space,

right,
events,
```
    
Adding an alignment key, like `left`, `right`, or `center` will apply that alignment to everything after it. Adding `space` will add a space that automatically expands to fill the available room in the widget. Everything above the space will align to the top, and everything below will align to the bottom.
