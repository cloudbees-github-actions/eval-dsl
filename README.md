# Evaluate DSL on a remote CloudBees CD/RO instance
## Description
This is one of several GitHub Actions provided on an "as-is" basis by CloudBees that enable users to write GitHub Action Workflows that send work to an external CloudBees CD/RO instance. This Action enables workflows to send DSL (Domain Specific Language) to a CloudBees CD/RO server for evaluation. The DSL can be used to create entities in the server, such as `procedure` and `release` models. In addition, the DSL has full access to the CloudBees CD/RO API; for example, `getProjects()` will return a list of all projects in the system. This GitHub Action can be used in a workflow or called in a `composite` GitHub Action definition. The latter approach implements the other CloudBees CD/RO actions such as `run-procedure` and `start-release`.
## Intended audience
For teams utilizing GitHub Actions for build and continuous integration, the CloudBees CD/RO Actions provide a mechanism for releasing software in a secure, governed, and auditable manner with deep visibility, as is required in regulated industries, for example. Platform or shared services teams can build reusable content in the CloudBees CD/RO platform that conforms to company standards and removes the burden of release automation from the application teams.
## Prerequisites
CloudBees CD/RO is an enterprise "on-premise" product that automates software delivery processes, including production deployments and releases. To use utilize this GitHub Action, it is necessary to have access to a CloudBees CD/RO instance, in particular, 
- A CloudBees CD/RO instance that GitHub Actions can access through REST calls (TCP port 443)
- A valid API token for the CloudBees CD/RO instance. A token can be generated from the _Access Token_ link on the user profile page of the CloudBees CD/RO user interface; see [Manage access tokens via the UI](https://docs.cloudbees.com/docs/cloudbees-cd/latest/intro/sign-in-cd#_manage_access_tokens_via_the_ui) documentation for details.
These values should be stored as GitHub Action secrets to be referenced securely in a GitHub Actions workflow.
## Usage
The CloudBees CD/RO GitHub Actions are called from _steps_ in a GitHub Actions _workflow_. The following workflow extract illustrates how the DSL in a file can be evaluated along with DSL substitution arguments, including _actual parameters_. DSL can be supplied inline through the `dsl` input field.
```yaml
steps:
  - name: Run EvalDSL Action
    uses: cloudbees-github-actions/eval-dsl@v1
    env:
      CDRO_URL: ${{ secrets.CDRO_URL }}
      CDRO_TOKEN: ${{ secrets.CDRO_TOKEN }}
    with:
      dsl-file: ./example-dsl.groovy
      dsl-args: |
        projectName: My project
        projectDescription: My project description
        procedureName: My procedure
      dsl-actual-parameter: |
        procedureInput1: 123
        procedureInput2: abc
```
### Inputs
| Name                   | Description                                                            | Required |
|------------------------|------------------------------------------------------------------------|----------|
| dsl                    | DSL code to be evaluated. This can be multiline.                       | no       |
| dsl-file               | Path to DSL file relative to repository                                | no       |
| dsl-args               | DSL template arguments. This will create the `args` map from a list of supplied parameters which can be referenced as `args.argName` in the DSL code, for example.           | no       |
| dsl-actual-parameter   | Parameters supplied in this field will be included in the `args` map as a `actualParamters` submap.   | no       |
| ignore-unverified-cert | Ignore unverified SSL certificate                                      | no       |
> **Note:**
> One of the two parameters, `dsl` or `dsl-file`, must be specified.
### Outputs
| Name                   | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| response               | The JSON data structure emited by the API call. This data can be parsed to retrieve individual values from the response, for example, `${{ fromJson(steps.start-release.outputs.response).flowRuntime.flowRuntimeId }}` where `start-release` is the name of a previous step and `.flowRuntime.flowRuntimeId` is the selector for the release pipeline runtime ID. |
### Secrets and Variables
The following GitHub secrets are needed to run the Action. These can be set in the _Secrets and variable_ section of the workflow repository _Settings_ tab.
| Name                   | Description                                                            | Required |
|------------------------|------------------------------------------------------------------------|----------|
| CDRO_URL               | CloudBees CD/RO server URL, e.g., `https://my-cdro.net` or `https://74.125.134.147` | yes |
| CDRO_TOKEN             | CloudBees CD/RO API Access token                                       | yes      |
## Examples
### Evaluate DSL file and inline DSL
1. Set up secrets in the repository settings for Actions. In the GitHub repository, select the _Settings_ tab, _Secrets_, _Variables_, and _Actions_. Use the _New Repository_ button to create the CDRO_URL and CDRO_TOKEN secrets.
2. Create a DSL file in the root directory of your repository, for example, `simple-project-dsl.groovy`:
```groovy
project "My simple project 1", {
	description = "My simple project 1 description"
}
```
3. Create a new workflow file in the `.github/workflows` directory, for example, `simple-project.yml`:
```yaml
name: Create Simple Project

on:
  workflow_dispatch:

env:
  CDRO_URL: ${{ secrets.CDRO_URL }}
  CDRO_TOKEN: ${{ secrets.CDRO_TOKEN }}

jobs:
  create-simple-project-with-dsl-file:
    runs-on: ubuntu-latest

  steps:
    - name: Checkout repository
      uses: actions/checkout@v3

      - name: Execute DSL file to create a project
        uses: cloudbees-github-actions/eval-dsl@v1
        with:
          dsl-file: ./simple-project-dsl.groovy

  create-simple-project-using-dsl-as-input:
    runs-on: ubuntu-latest

    steps:
    - name: Execute DSL input to create project
      uses: cloudbees-github-actions/eval-dsl@v1
      with:
        dsl: |
          project "My simple project 2", {
            description = "My simple project 2 description"
          }
```
4. Go to the GitHub `Actions` tab and run the workflow `Create Simple Project`
## Sample build and release repository
The [CloudBees CD/RO GitHub Actions Demonstration Repository](https://github.com/cloudbees-demos/gh-actions-demo) illustrates how to implement a build and release workflow with the CloudBees CD/RO GitHub Actions.
## How to create additional CloudBees CD/RO actions
The `eval-dsl` action is the basis of the other CloudBees-provided Actions such as `run-procedure` and `start-release`. It is implemented as a [JavaScript](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action) GitHub Action. The others are implemented as [Composite](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) type Actions. Using this Composite model, you can easily create your own CD/RO Actions. The `action.yaml` file in [run-procedure](https://github.com/cloudbees-github-actions/run-procedure) provides a useful template for doing this. Note that the `args` map is used to pass both DSL and Actual Parameters to the DSL. So, for example, the following workflow yaml,
```yaml
with:
  projectName: GHA Test
  procedureName: GHA Procedure
  actualParameter: |
    Input1: xyz
    Input2: abc
```
will create the `args` map
```groovy
def args=[
	projectName: "GHA Test",
	procedureName: "GHA Procedure",
	actualParameter: [
		Input1: "xyz",
		Input2: "abc"
	]
]

```
Which can be referenced from within the DSL in multiple ways:
```groovy
println "Procedure name: ${args.procedureName}"
runProcedure(args)
```
## Sample build and release repository
The [CloudBees CD/RO GitHub Actions Demonstration Repository](https://github.com/cloudbees-demos/gh-actions-demo) illustrates how to implement a build and release workflow with the CloudBees CD/RO GitHub Actions.
## License
The scripts and documentation in this project are released under the MIT License.
## Documentation
For more details about the CloudBees CD/RO product, view the [online documentation](https://docs.beescloud.com/docs/cloudbees-cd/latest/github-actions/).
