import * as sqlite3 from 'sqlite3';

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
    return new Promise((resolve, reject) => {
      this.db.run(`INSERT INTO ${DBController.tableName} VALUES (?, ?)`,
        [eventId, responseId],
        (err) => err ? reject(err) : resolve())
    });
  }

  /**
   * This gets the responseID of an eventID (it's possible for the returned value to be undefined)
   * @param {string} eventId
   * @returns {Promise<string|undefined>}
   */
  public getEventID(eventId: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM ${DBController.tableName} WHERE ${DBController.eventColumn} = ?`,
        [eventId], ((err: Error | null, row) => {
          if (err)
            reject(err);
          else if (row)
            resolve(row.responseID);
          else {
            resolve(undefined);
          }
        }))
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
      this.db.get('SELECT * FROM sqlite_master WHERE name = ?', [DBController.tableName], ((err, row) => {
        if (err)
          reject(err);
        if (row)
          resolve(true);
        else
          resolve(false);
      }))
    });
  }

  /**
   * Currently all this does is create a table for the events to go in.
   * @returns {Promise<void>}
   */
  private setupDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`CREATE TABLE ${DBController.tableName} (
      ${DBController.eventColumn} TEXT PRIMARY KEY,
      ${DBController.responseColumn} TEXT)`, (err) => err ? reject(err) : resolve());
    });
  }
}
