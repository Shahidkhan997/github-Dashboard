const axios = require("axios");
const Integration = require("../models/Integration");
const Organization = require("../models/Organization");
const Repository = require("../models/Repository");
const Commit = require("../models/Commit");

class GitHubController {
  async performFullSync(integration) {
    try {
      console.log("Starting full sync for integration:", integration._id);

      const headers = {
        Authorization: `token ${integration.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      };

      const syncResult = {
        organizations: 0,
        repositories: 0,
        commits: 0,
        errors: []
      };

      // Perform complete sync
      await this.syncCompleteData(integration, headers, syncResult);

      // Update last sync time
      integration.lastSyncAt = new Date();
      await integration.save();

      console.log("Full sync completed for integration:", integration._id);
      console.log("Sync results:", syncResult);
      
      return syncResult;
    } catch (error) {
      console.error("Full sync error:", error);
      throw error;
    }
  }

  async syncCompleteData(integration, headers, syncResult) {
    try {
      // Get organizations
      const orgResponse = await axios.get("https://api.github.com/user/orgs", {
        headers,
      });

      console.log("Processing organizations:", orgResponse.data.length);

      for (const org of orgResponse.data) {
        try {
          // Save organization data
          await Organization.findOneAndUpdate(
            { integrationId: integration._id, id: org.id },
            { 
              integrationId: integration._id,
              id: org.id,
              login: org.login,
              name: org.name || org.login,
              description: org.description,
              url: org.url,
              avatar_url: org.avatar_url,
              public_repos: org.public_repos,
              created_at: org.created_at
            },
            { upsert: true }
          );
          
          syncResult.organizations++;
          console.log(`Synced organization: ${org.login}`);

          // Sync organization repositories and commits
          await this.syncOrganizationComplete(integration, org.id, org.login, headers, syncResult);
          
        } catch (orgError) {
          console.error(`Error syncing organization ${org.login}:`, orgError.message);
          syncResult.errors.push(`Organization ${org.login}: ${orgError.message}`);
        }
      }
    } catch (error) {
      console.error("Sync complete data error:", error);
      throw error;
    }
  }

  async syncOrganizationComplete(integration, orgId, orgLogin, headers, syncResult) {
    try {
      let repoPage = 1;
      let hasMoreRepos = true;

      while (hasMoreRepos) {
        const repoResponse = await axios.get(
          `https://api.github.com/orgs/${orgLogin}/repos`,
          {
            headers,
            params: { page: repoPage, per_page: 50 },
          }
        );

        if (repoResponse.data.length === 0) {
          hasMoreRepos = false;
          break;
        }

        // Process each repository
        for (const repo of repoResponse.data) {
          try {
            // Save complete repository data
            await Repository.findOneAndUpdate(
              { integrationId: integration._id, id: repo.id },
              { 
                integrationId: integration._id,
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                organizationId: orgId,
                default_branch: repo.default_branch,
                description: repo.description,
                private: repo.private,
                html_url: repo.html_url,
                clone_url: repo.clone_url,
                language: repo.language,
                size: repo.size,
                stargazers_count: repo.stargazers_count,
                watchers_count: repo.watchers_count,
                forks_count: repo.forks_count,
                open_issues_count: repo.open_issues_count,
                created_at: repo.created_at,
                updated_at: repo.updated_at,
                pushed_at: repo.pushed_at
              },
              { upsert: true }
            );
            
            syncResult.repositories++;
            console.log(`Synced repository: ${repo.full_name}`);

            // Sync commits for this repository
            const commitCount = await this.syncRepositoryCommitsComplete(
              integration,
              repo.id,
              orgLogin,
              repo.name,
              headers
            );
            
            syncResult.commits += commitCount;
            
          } catch (repoError) {
            console.error(`Error syncing repository ${repo.full_name}:`, repoError.message);
            syncResult.errors.push(`Repository ${repo.full_name}: ${repoError.message}`);
          }
        }

        repoPage++;
        if (repoResponse.data.length < 50) hasMoreRepos = false;
      }
    } catch (error) {
      console.error("Sync organization complete error:", error);
      throw error;
    }
  }

  async syncRepositoryCommitsComplete(integration, repoId, orgLogin, repoName, headers) {
    try {
      let page = 1;
      let hasMore = true;
      let commitCount = 0;
      const maxCommits = 1000; // Reasonable limit for complete sync
      const batchSize = 50;

      console.log(`Starting commit sync for ${orgLogin}/${repoName}`);

      while (hasMore && commitCount < maxCommits) {
        console.log("try")
        try {
          const response = await axios.get(
            `https://api.github.com/repos/${orgLogin}/${repoName}/commits`,
            {
              headers,
              params: { 
                page, 
                per_page: batchSize,
              },
              timeout: 30000
            }
          );

          console.log("response",response.data)

          if (response.data.length === 0) {
            hasMore = false;
            break;
          }

          // Process commits in batch
          const commitBatch = [];
          for (const commit of response.data) {
            if (commitCount >= maxCommits) break;

            commitBatch.push({
              updateOne: {
                filter: {
                  integrationId: integration._id,
                  repositoryId: repoId,
                  sha: commit.sha,
                },
                update: {
                  integrationId: integration._id,
                  repositoryId: repoId,
                  sha: commit.sha,
                  message: commit.commit.message,
                  author: commit.commit.author,
                  committer: commit.commit.committer,
                  url: commit.url,
                  html_url: commit.html_url,
                  date: commit.commit.author.date,
                  verification: commit.commit.verification,
                  tree: commit.commit.tree
                },
                upsert: true
              }
            });

            commitCount++;
          }

          // Bulk insert/update commits
          if (commitBatch.length > 0) {
            await Commit.bulkWrite(commitBatch, { ordered: false });
          }

          page++;
          if (response.data.length < batchSize) hasMore = false;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (apiError) {
          if (apiError.response?.status === 409 || apiError.response?.status === 404) {
            console.log(`Skipping repository ${repoName}: ${apiError.response?.status}`);
            break;
          }
          throw apiError;
        }
      }

      console.log(`Synced ${commitCount} commits for ${orgLogin}/${repoName}`);
      return commitCount;
      
    } catch (error) {
      console.error(`Sync commits error for ${orgLogin}/${repoName}:`, error.message);
      return 0;
    }
  }

  getLastSyncDate(integration) {
    // Get commits from last 30 days or since last sync
    const lastSync = integration.lastSyncAt;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    if (lastSync && lastSync > thirtyDaysAgo) {
      return lastSync.toISOString();
    }
    return thirtyDaysAgo.toISOString();
  }

  syncData = async (req, res) => {
    try {
      const { userId } = req.body;

      console.log("Starting complete sync for user:", userId);
      const integration = await Integration.findOne({
        userId: userId.toString(),
        provider: "github",
        isActive: true,
      });

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      // Perform complete sync and wait for completion
      const syncResult = await this.performFullSync(integration);

      // Send response only after sync is complete
      res.json({ 
        success: true, 
        message: "Sync completed successfully",
        data: {
          organizations: syncResult.organizations,
          repositories: syncResult.repositories,
          commits: syncResult.commits,
          errors: syncResult.errors,
          syncedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to complete sync",
        message: error.message 
      });
    }
  };

  // Method to check sync status
  getSyncStatus = async (req, res) => {
    try {
      const { userId } = req.query;
      
      const integration = await Integration.findOne({
        userId: userId.toString(),
        provider: "github",
        isActive: true,
      });

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const [orgCount, repoCount, commitCount] = await Promise.all([
        Organization.countDocuments({ integrationId: integration._id }),
        Repository.countDocuments({ integrationId: integration._id }),
        Commit.countDocuments({ integrationId: integration._id })
      ]);

      res.json({
        success: true,
        lastSyncAt: integration.lastSyncAt,
        data: {
          totalOrganizations: orgCount,
          totalRepositories: repoCount,
          totalCommits: commitCount
        },
        status: "completed"
      });

    } catch (error) {
      console.error("Get sync status error:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  };
}

module.exports = new GitHubController();