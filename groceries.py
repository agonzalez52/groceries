#
# Version 1.2.1
#
# Created By: Angel Gonzalez
#

import sys
sys.path.append('helpers')
import groceries_module as grcm
import gdocs_module as gglm
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
    # color codes for text
    color_red = [0.0,0.0,1.0] # first week
    color_purple = [0.9,0.1,0.6] # second week
    color_yellow = [0.0,1.0,1.0] # test
    color_green = [0.0,1.0,0.0]
    color_blue = [1.0,0.0,0.0]
    color_black = [0.0,0.0,0.0]

    doc_id = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"
    sheet_id = "1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU"

    # doc_id = "13NY4wB-BJ-FasWhN7DaM8rIf7l1RRKgXiK-a-ECIeKs" # Test sheet
    # sheet_id = "1xd5yKYL3Ri5TWH17hIMApD4C7fOPcRHr2PK-63AsA_E" # Test sheet

    gdoc = gglm.GoogleDoc()
    gsheet = gglm.GoogleSheet()
    gdoc.doc_id = doc_id
    gsheet.sheet_id = sheet_id

    meal_batch = grcm.MealBatch()

    greeting()

    gdoc.doc_service, gsheet.sheet_service = gglm.build_services()

    meal_batch.week_date = date(2021, 6, 7)
    meal_batch.meal_ids = [41,17,51,25,11,50]
    gdoc.font_color = color_red
    grcm.update_grocery_list(meal_batch, gdoc, gsheet)
    #grcm.make_reminders(meal_ids,doc_service,sheet_service,sheet_id,start_date)


    print('\n\ndone =) \"Have a lovely day!\"\n\n')
