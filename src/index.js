import { promises as fs } from "fs";

import yaml from "yaml";
import dotenv from "dotenv";
import core from "@actions/core";
import http from "@actions/http-client";

import { cyan, yellow } from "./rainbow.js";


// Environment variables definition
//
// For development mode create a .env file in the root of the project
// with the following content:
//
// CDRO_URL=your-cdro-instance-url(example: https://cdro.example.com)
// CDRO_TOKEN=your_session_token(example: 0a92acf1-4bce-418b-aa53-1a7073532a64)
if (process.env.NODE_ENV === "development") {
    dotenv.config();
}

if (!process.env.CDRO_URL) {
    throw new Error("CDRO_URL is not defined");
}

if (!process.env.CDRO_TOKEN) {
    throw new Error("CDRO_TOKEN is not defined");
}
// End environment variables definition




// Read the inputs from the workflow file
core.info(yellow("Read the inputs ......"));

let parametersJSON;

const dsl = core.getInput('dsl');
const pathToDSLFile = core.getInput('dsl-file');
const parametersYAML = core.getInput('dsl-args');
const actualParameterYAML = core.getInput('dsl-actual-parameter');

const ignoreUnverifiedCert = core.getBooleanInput('ignore-unverified-cert');

if (!dsl && !pathToDSLFile) {
    throw new Error("Either the DSL itself or the path to the DSL file must be specified");
}

if (parametersYAML) {
    parametersJSON = yaml.parse(parametersYAML);
}

if (parametersJSON) {
  Object.keys(parametersJSON).forEach(key => {
    if (typeof parametersJSON[key] === "string") {
      parametersJSON[key] = yaml.parse(parametersJSON[key]);
    }
  });

  if (actualParameterYAML) {
    parametersJSON.actualParameter = yaml.parse(actualParameterYAML);
  }
}

core.info(cyan("The inputs are successfully read!\n"));
// End read inputs




// Define DSL body
core.info(yellow("Read DSL file ......"));

const DSLBody = dsl || await fs.readFile(pathToDSLFile, "utf-8");

core.info(cyan("DSL file is successfully read!\n"));
//  End define DSL body




// Set up HTTP client
const httpClient = new http.HttpClient(
  "GitHub Action - CloudBees EvalDSL",
  [],
  { ignoreSslError: ignoreUnverifiedCert }
);




// Get the CD/RO session
core.info(yellow("Send request to get the CD/RO session ......"));

let userName;
let sessionId;

try {
  const { statusCode , result} = await httpClient.postJson(
    `${process.env.CDRO_URL}/rest/v1.0/sessions`,
    { token: process.env.CDRO_TOKEN }
  );

  if (statusCode === 200 && result) {
    userName = result.userName;
    sessionId = result.sessionId;

    core.info(cyan("The CD/RO session is successfully received!\n"));
  } else {
    core.setFailed(`Session is not received; Response status code: ${statusCode}; Response body: ${result}`);
  }
} catch (error) {
  core.setFailed(error.message);
}
// End get the CD/RO session




// Evaluate DSL
core.info(yellow("Send request to evaluate DSL ......"));

const cookieSessionValue = JSON.stringify({
  username: userName,
  sessionId: sessionId
});

try {
  const { statusCode , result} = await httpClient.postJson(
    `${process.env.CDRO_URL}/rest/v1.0/server/dsl`,
    {
      dsl: DSLBody,
      format: "groovy",
      parameters: JSON.stringify(parametersJSON)
    },
    {
      "cookie": `session=${encodeURIComponent(cookieSessionValue)}`
    }
  );

  if (statusCode === 200 && result) {
    core.info(JSON.stringify(result));
    core.setOutput("response", result);

    core.info(cyan("DSL is successfully evaluated!"));
  } else {
    core.setFailed(`Session is not received; Response status code: ${statusCode}; Response body: ${result}`);
  }

} catch (error) {
  core.setFailed(error.message);
}
//  End evaluate DSL
