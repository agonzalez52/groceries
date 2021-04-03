#
# Version 1.1.0
#
# Created By: Angel Gonzalez
#

import groceries_funcs as grc
import groceries_gdocs_funcs as gfuncs
from datetime import date

if __name__ == '__main__':
    doc_service, sheet_service = gfuncs.build_services()
    # to create initial doc
    #doc = gfuncs.create_document(service)
    # for existing doc

    start_date = date(2021, 4, 12)
    grc.update_grocery_list([38,13,15,17], doc_service, sheet_service, start_date)
    #grc.make_reminders([12,41,13,24,37,1],doc_service,start_date)


    print('\n\ndone =) \"Have a lovely day!\"\n\n')
