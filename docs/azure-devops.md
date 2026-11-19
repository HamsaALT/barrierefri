# Running the pipeline on Azure DevOps

The pipeline is defined in [`azure-pipelines.yml`](../azure-pipelines.yml). It has two stages:

| Stage | What it does |
|---|---|
| **Build and test** | Two parallel jobs. **.NET API**: restore, build, unit and integration tests (Testcontainers starts PostgreSQL and Azurite), then publishes test results and Cobertura coverage. **React app**: `npm ci`, oxlint with accessibility rules, Prettier check, Vitest with axe-core checks, production build. |
| **Docker images** | Builds the API and web images, tagged with the build id. Runs only if every test passed. |

Pull requests to `main` run the same pipeline, so a red build blocks the merge once
a branch policy is set up (step 5).

## 1. Create an organisation and project

1. Go to [dev.azure.com](https://dev.azure.com) and sign in with a Microsoft account.
2. Create a free organisation, then a project called **Barrierefri** (visibility: public
   or private, both are free for small teams).

## 2. Connect the code

The code can live in either place:

- **GitHub (recommended for a portfolio):** keep the repo on GitHub. In the next step,
  pick *GitHub* as the source and authorise the Azure Pipelines app for this repository.
- **Azure Repos:** *Repos → Import repository* and paste the GitHub URL.

## 3. Create the pipeline

1. *Pipelines → New pipeline*.
2. Pick where the code is (GitHub or Azure Repos Git) and select the repository.
3. Choose **Existing Azure Pipelines YAML file**, branch `main`, path `/azure-pipelines.yml`.
4. Click **Run**.

> New organisations sometimes have no free Microsoft-hosted parallel jobs yet. If the
> run waits with "No hosted parallelism has been purchased or granted", request the
> free grant at https://aka.ms/azpipelines-parallelism-request. It usually takes a day
> or two.

## 4. Look at the results

- **Tests** tab: every backend and frontend test, with failures grouped.
- **Code Coverage** tab: line coverage for the API, from the Cobertura report.

## 5. Protect `main` (optional)

*Project settings → Repositories → (repo) → Policies → Branch policies for main*:
add **Build validation** with this pipeline. Pull requests then can't be completed
until the build is green. On GitHub, use a branch protection rule that requires the
Azure Pipelines check instead.

## 6. Add the status badge to the README

*Pipelines → (the pipeline) → ⋯ → Status badge*, copy the Markdown and paste it under
the title in the README. It looks like this:

```markdown
[![Build Status](https://dev.azure.com/<organisation>/Barrierefri/_apis/build/status/<pipeline-name>?branchName=main)](https://dev.azure.com/<organisation>/Barrierefri/_build/latest?definitionId=<id>&branchName=main)
```

## Publishing images (optional next step)

The pipeline builds images but doesn't push them anywhere. To publish them, create an
Azure Container Registry, add it as a *Docker Registry* service connection, then set
`containerRegistry: <connection name>` and `command: buildAndPush` on the two
`Docker@2` steps.
