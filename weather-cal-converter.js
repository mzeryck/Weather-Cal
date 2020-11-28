// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;

/*

WEATHER CAL CONVERTER
=====================
   ~ by @mzeryck ~   

This script converts Scriptable widgets into Weather Cal widget items. Read this entire comment before you begin.

BEFORE YOU START
================

You may need to modify your Weather Cal widget script, since it doesn't get updated when you run the "Update code" function. 

Find this line of code:
const code = importModule(codeFilename)

Paste this code directly after it:
const custom = {
  // Custom items and backgrounds can be added here.

}

Then, find this line of code:
const widget = await code.createWidget(layout, Script.name(), iCloudInUse)

Modify it so it looks like this:
const widget = await code.createWidget(layout, Script.name(), iCloudInUse, custom)


HOW THIS SCRIPT WORKS
=====================

- When you run this script, choose a name. This is the word you'll be adding to the Weather Cal layout.
- Select the file containing the widget script.
- When it displays the code, use the share icon in the top right to copy the text.
- Open a Weather Cal widget script and paste the code into the custom object after the comment. If you're pasting multiple items, make sure to paste it after the previous comma but before the final bracket.
- In your Weather Cal layout, add the name of your new widget item.


*********************

PLEASE NOTE
===========

Doing this without modifying the output will usually break the "Show widget preview" function of Weather Cal. This is because many widgets will detect that they're running in the Scriptable app and attempt to show their own preview or change their behavior. However, the widget will still work fine on your home screen.

*********************

 */

// Set parameters.
let cornerRadius = 20
let padding = 10

// Function to prompt for text.
async function prompt(message) {
  const alert = new Alert()
  alert.message = message
  alert.addTextField()
  alert.addAction("OK")
  await alert.present()
  return alert.textFieldValue(0)
}

// Function to generate an alert.
async function alert(message,options) {
  const alert = new Alert()
  alert.message = message
  for (option of options) {
    alert.addAction(option)
  }
  return await alert.presentAlert()
}

// Determine the item name.
let name = await prompt('Make sure you read the entire comment before you start.\n\nWhat name should this item have? Most items are one word in lowercase, like "date".')
name = name.trim()

if (!name.length) { 
  await alert("No name was entered.")
  Script.complete()
  return
}

// Let the use choose the file.
let path = await DocumentPicker.openFile()
let fm = FileManager.local()
await fm.downloadFileFromiCloud(path)

// Read it into a string.
let input = fm.readString(path)

// Determine what happens to parameters.
let arg
if (input.includes("args.widgetParameter")) {
  let hardCode = await alert("This widget uses the widget parameter. Would you like to specify a value now?",["Keep using the widget parameter","Specify a hard-coded value"])
  
  if (hardCode) {
    arg = await prompt("Specify the hard-coded value of the widget parameter.")
    arg = arg.trim()
    
    if (arg.length > 0) {
      input = input.replaceAll('args.widgetParameter',`"${arg}"`)
    }
  }
}

// Replace the widget declaration.
let regex = /(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*) *= *new ListWidget\(\)/
let widgetName = input.match(regex)[2]
input = input.replace(regex, `$1$2 = code.align(column)
$2.layoutVertically()
$2.cornerRadius = ${cornerRadius}
$2.setPadding(${padding}, ${padding}, ${padding}, ${padding})`)

// Remove impossible actions.
let removals = ["presentSmall","presentMedium","Script.setWidget","Script.complete",`return ${widgetName}`,"refreshAfterDate"]

function includeRow(row) {
  for (item of removals) {
    if (row.includes(item)) return false
  }
  return true
}

let rows = input.split(/\r?\n/).filter(includeRow)
let output = rows.join("\n")

// Add the method boilerplate.
output = `async ${name}(column) {
${output}
},`

// Display the modified script.
await QuickLook.present(output)
Script.complete()
