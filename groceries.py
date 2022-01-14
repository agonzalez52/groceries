#
# Version 2.0.0
#
# Created By: Angel Gonzalez
#

import sys
sys.path.append('helpers')
import groceries_module as grc
import gdocs_module as gdocs
import font_colors as fc
from datetime import date
from datetime import datetime

def greeting():
    curr_hour = datetime.now().hour
    if curr_hour >= 0 and curr_hour < 12:
        print('\n\nGood Morning!\n\n')
    elif curr_hour >=12 and curr_hour < 17:
        print('\n\nGood Afternoon!\n\n')
    else:
        print('\n\nGood Evening!\n\n')

if __name__ == '__main__':
    greeting()

    '''
    STEP 1: UNCOMMENT CORRECT IDS FOR GOOGLE DOC AND SHEET
    '''
    # doc_id = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"
    # sheet_id = "1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU"

    doc_id = "13NY4wB-BJ-FasWhN7DaM8rIf7l1RRKgXiK-a-ECIeKs" # Test sheet
    sheet_id = "1xd5yKYL3Ri5TWH17hIMApD4C7fOPcRHr2PK-63AsA_E" # Test sheet

    angel_calendar_id = 'angelmg58@gmail.com'

    '''
    STEP 2: SET THESE VARIABLES
    '''
    meal_week = date(1975, 3, 5)
    meal_ids = [3]
    font_color = fc.COLOR_RED

    '''
    STEP 3: RUN PROGRAM IN TERMINAL
        $ python groceries.py
    '''

    doc_service, sheet_service, calendar_service, mail_service = gdocs.build_services()
    gdoc = gdocs.GoogleDoc(doc_id, doc_service)
    gsheet = gdocs.GoogleSheet(sheet_id, sheet_service)
    gcalendar = gdocs.GoogleCalendar(angel_calendar_id, calendar_service)
    gmail = gdocs.GoogleMail(mail_service)
    gapi = gdocs.GoogleAPI(gdoc, gsheet, gcalendar, gmail)

    meal_batch = grc.MealBatch(meal_week, meal_ids)
    gapi.gdoc.set_font_color(font_color)
    grc.update_grocery_list(meal_batch, gapi, reminders_only=0)

    print('\n\ndone =) \"Have a lovely day!\"\n\n')
