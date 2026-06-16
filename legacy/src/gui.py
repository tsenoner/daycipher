# !/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on: Thu 02 Dec 2021 00:45:05
Description: GUI for the day_of_date app

@author: tsenoner
"""
import datetime
from random import randrange
from sys import platform
from tkinter import *
from tkinter import ttk
from typing import List

from PIL import Image, ImageTk

from db_api import Database
from explanation import Doomsday
from progress import show_progress


class GUI:
    weekdays:  List[str] = ['Sunday', 'Monday', 'Tuesday',
                            'Wednesday', 'Thursday', 'Friday', 'Saturday']
    db:        Database
    date:      datetime.date
    last_date: datetime.date = None
    # recs:      List[tuple]

    nr_questions:       int = 0
    nr_correct_results: int = 0

    def __init__(self, db: Database = None) -> None:
        self.db = db
        self.recs = []
        self.__setup()

    def __setup(self) -> None:
        # --- root window ---
        root = Tk()
        geometry = self.__get_screen_center(
            root, width=360, height=200, aligned="left")
        root.geometry(geometry)
        root.deiconify()  # draw the window frame after setting its position
        root.resizable(False, False)

        root.title("Day of Date")
        root.bind("<Return>", self.submit)

        # --- change text color of tabs ---
        style = ttk.Style()
        style.map("TNotebook.Tab", foreground=[("selected", "black")])
        style.configure("TNotebook.Tab", foreground="white")
        # --- create tabs ---
        notebook = ttk.Notebook(root)
        notebook.grid(row=0, column=0, sticky=(N, W, E, S))

        mainframe = ttk.Frame(notebook)  # , padding="3 3 12 12")
        stat_frame = ttk.Frame(notebook)  # , padding="3 3 12 12")
        mainframe.grid(row=0, column=0, sticky=(N, W, E, S))
        # root.columnconfigure(0, weight=1)
        # root.rowconfigure(0, weight=1)

        notebook.add(mainframe, text="main")
        notebook.add(stat_frame, text="Statistics")

        self.root = root

        # ---------- ROW 1 ----------
        # --- What day is: ---
        ttk.Label(mainframe, text="What day is:").grid(
            row=1, column=1, sticky=E)

        # --- data field ---
        self.date_text = StringVar()
        ttk.Label(mainframe, textvariable=self.date_text).grid(
            row=1, column=2, sticky=W)

        # --- current session ---
        self.session_state_text = StringVar()
        self.__update_session_state()
        ttk.Label(mainframe, textvariable=self.session_state_text).grid(
            row=1, column=3, sticky=W)

        # --- info icon ---
        info_icon_white = PhotoImage(file="img/info_white.png")
        info_icon_black = PhotoImage(file="img/info_black.png")
        curser = "pointinghand" if platform == "darwin" else "draft_large"
        info_icon = ttk.Label(mainframe, image=info_icon_white, cursor=curser)
        info_icon.grid(row=1, column=3, sticky=E)
        info_icon.bind("<Button-1>", self.info_window)
        info_icon.bind("<Enter>",
                       lambda event: self.__change_icon(info_icon_black, event))
        info_icon.bind("<Leave>",
                       lambda event: self.__change_icon(info_icon_white, event))

        # ---------- ROW 2 ----------
        # --- guessed day ---
        self.entered_day = StringVar()
        self.day_field = ttk.Entry(mainframe, width=8,
                                   textvariable=self.entered_day)
        self.day_field.grid(row=2, column=1, sticky=(W, E))

        # --- submit button ---
        submit_btn = ttk.Button(mainframe, text="Submit", command=self.submit)
        submit_btn.grid(row=2, column=2, sticky=W)

        # --- explanation button ---
        explanation_btn = ttk.Button(
            mainframe, text="Explanation", command=self.explain, padding=-7.5)  # width=8)
        explanation_btn.grid(row=2, column=3, sticky=W)

        # ---------- ROW 3 ----------
        # --- result ---
        self.result_text = StringVar()
        self.result_field = ttk.Label(mainframe, textvariable=self.result_text)
        self.result_field.grid(row=3, column=1, sticky=E)

        # --- more info ---
        self.info_text = StringVar()
        self.info_text.set("\n")
        self.info_field = ttk.Label(mainframe, textvariable=self.info_text)
        self.info_field.grid(row=3, column=2, columnspan=2, sticky=W)

        # add padding to all elements
        for child in mainframe.winfo_children():
            child.grid_configure(padx=6.5, pady=7.5)

        # ---------- Statistics frame ----------
        self.stat_label = ttk.Label(stat_frame)
        self.stat_label.grid(row=1, column=1, sticky=(N, W, E, S))
        notebook.bind("<<NotebookTabChanged>>", self.__update_progress)

        self.__preparation()
        self.root.mainloop()

    def __preparation(self):
        self.gen_random_date()
        self.entered_day.set("")
        self.day_field.focus()

    def __get_screen_center(self, root, width, height, aligned: str = "center", formatted: bool = True):
        alignment = {"left": 2.75, "center": 2, "right": 0.75}
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x_pos = round(screen_width//alignment[aligned]) - width//2
        y_pos = screen_height//2 - height//2

        if formatted:
            center = f"{width}x{height}+{x_pos}+{y_pos}"
        else:
            center = width, height, x_pos, y_pos
        return center

    def __change_icon(self, img, event):
        event.widget.configure(image=img)

    def __change_focus_after_win_close(self, win) -> None:
        win.protocol("WM_DELETE_WINDOW", lambda: [
                     win.destroy(), self.day_field.focus()])

    def info_window(self, event):
        width, height = 800, 650
        novi = Toplevel(self.root)
        novi.withdraw()
        novi.title("Cheatsheet: calculate day from date")
        *_, y_pos = self.__get_screen_center(self.root, width, height, formatted=False)
        # self.root.update()
        x_pos = self.root.winfo_x() + self.root.winfo_width()
        novi.geometry(f"{width}x{height}+{x_pos}+{y_pos}")
        novi.deiconify()
        canvas = Canvas(novi, width=width, height=height)
        canvas.pack(expand=YES, fill=BOTH)

        image = Image.open("doc/universal_cal.png")
        image = image.resize((width-30, height-30))
        cheatsheet = ImageTk.PhotoImage(image)
        canvas.create_image(15, 15, image=cheatsheet, anchor=(NW))
        canvas.cheatsheet = cheatsheet
        self.__change_focus_after_win_close(novi)

    def gen_random_date(self, event=None, start_year: int = 1500, end_year: int = 2500):
        assert end_year >= start_year, "'end_year' has to be larger than 'start_year'"
        min_date = datetime.date(start_year, 1, 1)
        max_date = datetime.date(end_year, 12, 31)
        delta = max_date - min_date
        int_delta = (delta.days)
        random_day = randrange(int_delta)
        date = min_date + datetime.timedelta(days=random_day)
        self.date = date
        self.date_text.set(date.strftime("%d-%m-%Y"))

    def __translate_entry(self) -> int:
        entered_text = self.entered_day.get()
        day_abbr = [weekday[:3] for weekday in self.weekdays]

        # check if enteret text is numeric
        if entered_text.isnumeric():
            day = int(entered_text)
            if day >= 0 and day <= 6:
                result = day
            else:
                result = None
        # else check if it matches a weekday (full name or three letters)
        else:
            entry = entered_text.capitalize()
            if entry in self.weekdays:
                result = self.weekdays.index(entry)
            elif entry in day_abbr:
                result = day_abbr.index(entry)
            else:
                result = None
        return result

    def __get_formatted_info(self) -> str:
        formatted_date = self.date.strftime('%d-%m-%Y')
        actual_day = self.date.strftime("%A")
        return f"{formatted_date} is a {actual_day}\n"

    def __display_message(self, header: str, header_color: str, msg: str) -> None:
        self.result_field.configure(foreground=header_color)
        self.result_text.set(header)
        self.info_text.set(msg)
        self.day_field.focus()

    def __update_session_state(self):
        text = f"{self.nr_correct_results} / {self.nr_questions}"
        self.session_state_text.set(text)

    def __update_progress(self, event=None):
        # check if a database is connected and that at least one row is present
        if self.db is not None and self.db.is_not_empty():
            # check if the second tab 'Statistics' is selected
            if event is not None and event.widget.index("current") == 1:
                show_progress(self.db)
                stat_img = PhotoImage(file="img/stat.png")
                self.stat_label.configure(image=stat_img)
                self.stat_label.image = stat_img

    def submit(self, event=None):
        weekday = self.__translate_entry()
        if weekday is None:
            msg = "Entry cannot be interpreted.\nTry again..."
            self.__display_message("ERROR:\n", "red", msg)
        else:
            msg = self.__get_formatted_info()
            actual_weekday = self.date.isoweekday() % 7
            if weekday == actual_weekday:
                header = "CORRECT:\n"
                color = "green"
            else:
                header = "WRONG:\n"
                msg += "Checkout 'Explanation'..."
                color = "#990500"
            self.__display_message(header, color, msg)

            # update session state
            self.nr_questions += 1
            if actual_weekday == weekday:
                self.nr_correct_results += 1
            self.__update_session_state()

            # enter data into Database
            if self.db is not None:
                self.db.insert(date=self.date,
                               real_day=self.weekdays[actual_weekday],
                               guessed_day=self.weekdays[weekday])

            # Generate next date
            self.last_date = self.date
            self.__preparation()

    def explain(self, event=None):
        if self.last_date is None:
            msg = "First try to guess the date.\nI can explain it to you later."
            self.__display_message("ERROR:\n", "red", msg)
        else:
            novi = Toplevel(self.root)
            novi.title("Explanation on given example")
            # position window next to self.root
            novi.withdraw()
            self.root.update()
            x_pos = self.root.winfo_x() + self.root.winfo_width()
            y_pos = self.root.winfo_y() - 100
            position = f"+{x_pos}+{y_pos}"
            novi.geometry(position)
            novi.deiconify()
            novi.resizable(False, False)
            self.__change_focus_after_win_close(novi)

            # create the explanation text
            doom = Doomsday(self.last_date)
            doom.create_explanation_text(novi)

    def records(self) -> List[tuple]:
        return self.recs


def main():
    # GUI()
    with Database() as db:
        gui = GUI(db)


if __name__ == "__main__":
    main()
