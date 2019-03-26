# WhatsApp Chat Plot
As the name suggests, this python script plots a graph of _number of messages sent vs months_ of your WhatsApp Chat. You need to supply a txt file which is basically your chat exported from WhatsApp.

## Update
This tool is now available [here]() with multiple options. Go play with them.

![Example plot](https://github.com/vishal-wadhwa/WhatsApp-Chat-Plot/blob/master/whatsapp_chat.png)

## Usage 
1. Exporting chat: 

    a. Open WhatsApp settings.  
    b. Go to chat settings.  
    c. Then chat history.  
    d. Then export chat.  
    e. Now select the chat you want to export _without media_.

2. Then just execute this script: `python main.py whatsappchat.txt`. (python)

3. Image will be saved as a `png` file in the same directory as `txt` file. (python)

## Dependencies (python)
[matplotlib](https://matplotlib.org/)

## Todo:
[] Add support for other graphs like polar, doughnut, pie & radar.
[] Update sample file link in index.html
[] Update app link in readme

## Bugs:
[] Some parameters trigger change of color in the WebApp.
