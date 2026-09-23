import { parseOneRosterBundle, type OneRosterCsvFiles } from "./oneroster";
import type { RosterBundle, RosterSource } from "./types";

export class OneRosterCsvSource implements RosterSource {
  readonly sourceSystem = "oneroster-csv";
  private readonly files: OneRosterCsvFiles;

  constructor(files: OneRosterCsvFiles) {
    this.files = files;
  }

  async fetchBundle(): Promise<RosterBundle> {
    return parseOneRosterBundle(this.files);
  }
}

export class CleverSource implements RosterSource {
  readonly sourceSystem = "clever";

  async fetchBundle(): Promise<RosterBundle> {
    throw new Error("CleverSource: not configured. See this file's own header for the CLEVER_* env contract; no district partner is connected yet.");
  }
}

export class ClassLinkSource implements RosterSource {
  readonly sourceSystem = "classlink";

  async fetchBundle(): Promise<RosterBundle> {
    throw new Error("ClassLinkSource: not configured. See this file's own header for the CLASSLINK_* env contract; no district partner is connected yet.");
  }
}

export class GoogleClassroomSource implements RosterSource {
  readonly sourceSystem = "google-classroom";

  async fetchBundle(): Promise<RosterBundle> {
    throw new Error("GoogleClassroomSource: not configured. Set the GOOGLE_CLASSROOM_* env contract once a school connects Classroom.");
  }
}
