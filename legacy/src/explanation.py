from tkinter import Text
import datetime
from typing import List, Tuple


class Doomsday:
    weekdays:          List[str] = ["Sunday", "Monday", "Tuesday", "Wednesday",
                                    "Thursday", "Friday", "Saturday"]
    doomsday_weekdays: List[str] = ["Nonday", "Oneday", "Twosday", "Threesday",
                                    "Foursday", "Fiveday", "Sixturday"]
    date:      datetime.date
    nice_date: str
    nice_md:   str
    year:      int
    doomsdays: List[str]

    def __init__(self, date) -> None:
        self.date = date
        self.nice_date = date.strftime("%d-%m-%Y")
        self.nice_md = date.strftime("%d/%m")
        self.year = date.year
        self.get_doomsdays()

    def get_doomsdays(self) -> None:
        doomsdays = ["03/14", "04/04", "05/09", "06/06",
                     "07/11", "08/08", "09/05", "10/10", "11/07", "12/12"]
        if self.year % 100 != 0 and self.year % 4 == 0:
            doomsdays[0:0] = ["01/04", "02/29"]
        else:
            doomsdays[0:0] = ["01/03", "02/28"]
        self.doomsdays = doomsdays

    def get_doomsday_variables(self) -> Tuple[int, int, int, int, int, int]:
        """Get all variables to calculate the doomsday of the given year
        """
        # STEP A
        century = self.year // 100 * 100
        century_doomsday = datetime.date(century, 4, 4).isoweekday() % 7
        # STEP B
        abbr_year = self.year % 100
        b = abbr_year // 12
        # STEP C
        c = abbr_year % 12
        # STEP D
        d = c // 4
        # STEP E
        e = century_doomsday + b + c + d
        # domesday of this year
        year_doomsday = e % 7
        return century_doomsday, abbr_year, b, c, d, e, year_doomsday

    def get_closest_domesday(self) -> Tuple[str, int]:
        closest_doomsday = ""
        diff_to_doomsday = 365
        for doomsday in self.doomsdays:
            doomsday_date = datetime.datetime.strptime(
                f"{self.year}/{doomsday}", "%Y/%m/%d").date()
            diff = (self.date - doomsday_date).days
            if abs(diff) < abs(diff_to_doomsday):
                closest_doomsday = doomsday
                diff_to_doomsday = diff
        return closest_doomsday, diff_to_doomsday

    def get_weekday(self) -> int:
        *_, year_doomsday = self.get_doomsday_variables()
        _, diff_to_doomsday = self.get_closest_domesday()
        weekday_int = (year_doomsday + diff_to_doomsday) % 7
        return weekday_int, self.weekdays[weekday_int], self.doomsday_weekdays[weekday_int]

    def create_explanation_text(self, window) -> None:
        # --- get all needed variables ---
        century_doomsday, abbr_year, b, c, d, e, year_doomsday = self.get_doomsday_variables()
        closest_doomsday, diff = self.get_closest_domesday()
        weekday_int, weekday, weekday_doom = self.get_weekday()

        # --- create text widget ---
        text = Text(window, width=40, height=18, padx=10,
                    pady=10, highlightthickness=0, font=("Courier", 20))
        text.pack(pady=10, padx=10)

        # --- write text ---
        text.insert(1.0, f"  Explaination for {self.nice_date}  \n", ("ttl",))
        text.insert(2.0, f"Doomsday for the year {self.year}:\n", ("subttl",))
        text.insert(3.0, f"- a = century doomsdays  = {century_doomsday}\n")
        text.insert(4.0, f"- b = {abbr_year:02d} divisable by 12 = {b}\n")
        text.insert(5.0, f"- c = {abbr_year:02d} modulo 12       = {c}\n")
        text.insert(6.0, f"- d = c divisable by 4   = {d}\n")
        text.insert(7.0, f"- e = a + b + c + d      = {e}\n")
        text.insert(8.0, f"- doomsday = e modulo 7  = {year_doomsday}\n")
        text.insert(9.0, "Difference to nearest doomsdays:\n", ("subttl",))
        text.insert(10.0, f"- {self.nice_md} - {closest_doomsday} = {diff}\n")
        text.insert(11.0, f"Weekday of {self.nice_date}:\n", ("subttl",))
        tmp_sum = year_doomsday + diff
        text.insert(12.0, f"- {year_doomsday}{diff:+} = {tmp_sum}\n")
        text.insert(13.0, f"- {tmp_sum} modulo 7 = {weekday_int}\n")
        text.insert(14.0, f"- {weekday_int} = {weekday_doom} = {weekday} \n")

        # --- format text ---
        # format title and subtitle
        text.tag_configure("ttl", justify='center',
                           font=("Courier", 22), spacing1=10, spacing3=10)
        text.tag_configure("subttl", underline=True, spacing1=15, spacing3=3)
        # add border to main title
        text.tag_add("border", "1.1", "1.end")
        text.tag_configure("border", borderwidth=2, relief="raised")
        # color 'year_doomsday'
        text.tag_add("year_doomsday", "8.end-2c wordstart", "8.end wordend")
        text.tag_add("year_doomsday", "12.2 wordstart", "12.2 wordend")
        text.tag_configure("year_doomsday", foreground="blue")
        # color 'dommsday_diff'
        text.tag_add("diff", "10.end-2c wordstart", "10.end wordend")
        text.tag_add("diff", "12.3 wordstart", "12.4 wordend")
        text.tag_configure("diff", foreground="red")
        # color 'result'
        text.tag_add("result", "14.end-2c wordstart-1c", "14.end-1c wordend")
        text.tag_configure("result", foreground="teal", font=("Courier", 24),
                           borderwidth=3, relief="ridge")

        # do not allow to modify the text
        text["state"] = 'disabled'

if __name__ == "__main__":
    from tkinter import Tk
    root = Tk()
    root.geometry("+650+300")
    root.deiconify()
    root.resizable(False, False)

    date = datetime.date(1968, 3, 10)
    doom = Doomsday(date)
    doom.create_explanation_text(root)
    root.mainloop()
