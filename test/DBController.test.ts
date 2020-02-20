import { DBController } from "../src/DBController";
import * as fs from "fs";

const DBNAME = 'events.db';
const EVENTID = '123';
const RESPONSEID = '456';
const db = new DBController(DBNAME);


it('DBController should start', async () => {
  const startPromise = db.start();
  await expect(startPromise).resolves.not.toBeDefined();
});

it('DBController should add events', async () => {
  try {
    await db.addEventID(EVENTID, RESPONSEID);
  } catch (err) {
    expect(err).not.toBeDefined();
  }
});

it('DBController should get events', async function () {
  const responseID = await db.getEventID(EVENTID);
  expect(responseID).toBe(RESPONSEID)
});

afterAll(() => fs.unlinkSync(DBNAME));
