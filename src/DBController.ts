import * as sqlite3 from 'sqlite3';

export type StoredResponseEvent = {
  responseID: string
}

export class DBController {
  private static readonly tableName = 'events';
  private static readonly responseColumn = 'responseID';
  private static readonly eventColumn = 'eventID';
  private isReady = false;
  private readonly db: sqlite3.Database;
  private readonly dbName: string;

  public constructor(dbName: string) {
    this.db = new sqlite3.Database(dbName);
    this.dbName = dbName;
  }

  /**
   * This adds a pair of eventID and it's responseID to the database
   * @param {string} eventId
   * @param {string} responseId
   * @returns {Promise<void>}
   */
  public addEventID(eventId: string, responseId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.isReady)
        await this.start();

      this.db.run(`INSERT INTO ${DBController.tableName} VALUES (?, ?)`,
        [eventId, responseId],
        (err: Error | null) => err ? reject(err) : resolve())
    });
  }

  /**
   * This gets the responseID of an eventID (it's possible for the returned value to be undefined)
   * @param {string} eventId
   * @returns {Promise<string|undefined>}
   */
  public getEventID(eventId: string): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
      if (!this.isReady)
        await this.start();
      const prep = this.db.prepare(
        `SELECT ${DBController.responseColumn} FROM ${DBController.tableName} WHERE ${DBController.eventColumn} = ?`,
        [eventId]
      );
      prep.get(((err: Error | null, response: StoredResponseEvent | undefined) => {
        if (err)
          reject(err);
        else
          resolve(response ? response.responseID : undefined);
      }));
    });
  }

  /**
   * This gets the database controller ready
   * @returns {Promise<void>}
   */
  public async start(): Promise<void> {
    // Check if the sqlite3 database is ready
    const isReady = await this.checkDB();

    // If it isn't ready
    if (!isReady)
      // Then set it up
      await this.setupDB();

    this.isReady = true;
  }

  /**
   * This method checks whether or not the database is ready to be used.
   * @returns {Promise<boolean>}
   */
  private checkDB(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const prep = this.db.prepare(
        'SELECT * FROM sqlite_master WHERE name = ?',
        [DBController.tableName]
      );

      prep.get(((err, row: any[]) => {
        if (err)
          reject(err);
        if (row)
          resolve(true);
        else
          resolve(false);
      }));
    });
  }

  /**
   * Currently all this does is create a table for the events to go in.
   * @returns {Promise<void>}
   */
  private setupDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const prep = this.db.prepare(`CREATE TABLE ${DBController.tableName} (
        ${DBController.eventColumn} TEXT PRIMARY KEY,
        ${DBController.responseColumn} TEXT)`
      );

      prep.run((err) => err ? reject(err) : resolve());
    });
  }
}
