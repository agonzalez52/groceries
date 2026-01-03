#
# Version 3.0.0
#
# Created By: Angel Gonzalez
#

import os
import sys
sys.path.append('helpers')
import meal_grocery_updates as grc
import meal_components as mc
import google_office as goffice
import color_codes as colors
from datetime import date
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
GDOC_ID_PROD = os.getenv("GDOC_ID_PROD")
GSHEET_ID_PROD = os.getenv("GSHEET_ID_PROD")
GDOC_ID_DEV = os.getenv("GDOC_ID_DEV")
GSHEET_ID_DEV = os.getenv("GSHEET_ID_DEV")
MY_CALENDAR_GMAIL = os.getenv("MY_CALENDAR_GMAIL")

def greeting():
    curr_hour = datetime.now().hour
    if curr_hour >= 0 and curr_hour < 12:
        print('\n\nGood Morning! (ctrl+c to terminate)\n\n')
    elif curr_hour >=12 and curr_hour < 17:
        print('\n\nGood Afternoon! (ctrl+c to terminate)\n\n')
    else:
        print('\n\nGood Evening! (ctrl+c to terminate)\n\n')

if __name__ == '__main__':
    greeting()

    '''
    STEP 1: USE CORRECT IDS FOR GOOGLE DOC AND SHEET
    '''
    doc_id = GDOC_ID_DEV # Test sheet
    sheet_id = GSHEET_ID_DEV # Test sheet

    '''
    STEP 2: SET THESE VARIABLES
    '''
    meal_week = date(2020,10,5)
    meal_ids = [0,0,1,0,0,0]
    font_color = colors.FONT_PURPLE

    '''
    STEP 3: RUN PROGRAM IN TERMINAL
        $ python groceries.py
    '''

# Build Google services
    doc_service, sheet_service, calendar_service, mail_service = goffice.build_services()
    gdoc = goffice.GoogleDoc(doc_id, doc_service)
    gsheet = goffice.GoogleSheet(sheet_id, sheet_service)
    gcalendar = goffice.GoogleCalendar(MY_CALENDAR_GMAIL, calendar_service)
    gmail = goffice.GoogleMail(mail_service)
    gapi = goffice.GoogleAPI(gdoc, gsheet, gcalendar, gmail)

    meal_batch = mc.MealBatch(meal_week, meal_ids)
    gapi.gdoc.set_font_color(font_color)
    grc.update_grocery_list(meal_batch, gapi, False, reminders_only=0, checklist=1)

    print('\n\ndone =) \"Have a lovely day!\"\n\n')
