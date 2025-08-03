const Organization = require("../models/Organization");
const Repository = require("../models/Repository");
const Commit = require("../models/Commit");
const PullRequest = require("../models/PullRequest");
const Issue = require("../models/Issue");
const User = require("../models/User");
const Integration = require("../models/Integration");

class DataController {
  getCollectionModel(collection) {
    const models = {
      organizations: Organization,
      repositories: Repository,
      commits: Commit,
      pullrequests: PullRequest,
      issues: Issue,
      users: User,
    };
    return models[collection];
  }

  getSearchFields(collection) {
    const searchFields = {
      organizations: ["login", "name", "description", "location"],
      repositories: ["name", "full_name", "description", "language"],
      commits: ["message", "author.name", "author.email"],
      pullrequests: ["title", "body", "user.login", "state"],
      issues: ["title", "body", "user.login", "state"],
      users: ["login", "name", "email", "company", "location"],
    };
    return searchFields[collection] || [];
  }

  async getCollections(req, res) {
    try {
      const collections = [
        { name: "organizations", label: "Organizations" },
        { name: "repositories", label: "Repositories" },
        { name: "commits", label: "Commits" },
        { name: "pullrequests", label: "Pull Requests" },
        { name: "issues", label: "Issues" },
        { name: "users", label: "Users" },
      ];

      res.json(collections);
    } catch (error) {
      console.error("Get collections error:", error);
      res.status(500).json({ error: "Failed to get collections" });
    }
  }

  async getData(req, res) {
    try {
      const { collection, userId } = req.params;
      console.log(
        "Fetching data for collection:",
        collection,
        "and userId:",
        userId
      );
      const {
        page = 1,
        limit = 50,
        sortField = "createdAt",
        sortOrder = "desc",
        search = "",
        filters = {},
      } = req.query;

      // Get integration
      const integration = await Integration.findOne({
        userId: userId.toString(),
        provider: "github",
        isActive: true,
      });

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const Model = await this.getCollectionModel(collection);
      if (!Model) {
        return res.status(400).json({ error: "Invalid collection" });
      }

      // Build query
      const query = { integrationId: integration._id };

      // Apply search
      if (search) {
        const searchFields = this.getSearchFields(collection);
        const searchConditions = searchFields.map((field) => ({
          [field]: { $regex: search, $options: "i" },
        }));
        query.$or = searchConditions;
      }

      // Apply filters
      if (filters && typeof filters === "object") {
        Object.keys(filters).forEach((key) => {
          if (
            filters[key] !== "" &&
            filters[key] !== null &&
            filters[key] !== undefined
          ) {
            // Handle different filter types
            if (
              typeof filters[key] === "string" &&
              filters[key].includes(",")
            ) {
              // Multi-select filter
              query[key] = { $in: filters[key].split(",") };
            } else if (
              typeof filters[key] === "string" &&
              !isNaN(Date.parse(filters[key]))
            ) {
              // Date filter
              query[key] = { $gte: new Date(filters[key]) };
            } else {
              // Text filter
              query[key] = { $regex: filters[key], $options: "i" };
            }
          }
        });
      }

      // Build sort object
      const sort = {};
      sort[sortField] = sortOrder === "desc" ? -1 : 1;

      // Execute query
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [data, total] = await Promise.all([
        Model.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
        Model.countDocuments(query),
      ]);

      // Get column definitions
      const columns = this.getColumnDefinitions(collection, data);

      res.json({
        data,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        columns,
      });
    } catch (error) {
      console.error("Get data error:", error);
      res.status(500).json({ error: "Failed to get data" });
    }
  }

  getSearchFields(collection) {
    const searchFields = {
      organizations: ["login", "name", "description", "location"],
      repositories: ["name", "full_name", "description", "language"],
      commits: ["message", "author.name", "author.email"],
      pullrequests: ["title", "body", "user.login", "state"],
      issues: ["title", "body", "user.login", "state"],
      users: ["login", "name", "email", "company", "location"],
    };
    return searchFields[collection] || [];
  }

  getColumnDefinitions(collection, data) {
    if (!data || data.length === 0) return [];

    const sample = data[0];
    const columns = [];

    // Helper function to create column definition
    const createColumn = (field, headerName, type = "text") => ({
      field,
      headerName,
      type,
      sortable: true,
      filter: true,
      resizable: true,
    });

    // Define columns based on collection type
    switch (collection) {
      case "organizations":
        columns.push(
          createColumn("login", "Login"),
          createColumn("name", "Name"),
          createColumn("description", "Description"),
          createColumn("location", "Location"),
          createColumn("public_repos", "Public Repos", "number"),
          createColumn("public_members", "Members", "number"),
          createColumn("created_at", "Created", "date")
        );
        break;

      case "repositories":
        columns.push(
          createColumn("name", "Name"),
          createColumn("full_name", "Full Name"),
          createColumn("description", "Description"),
          createColumn("language", "Language"),
          createColumn("stargazers_count", "Stars", "number"),
          createColumn("forks_count", "Forks", "number"),
          createColumn("open_issues_count", "Open Issues", "number"),
          createColumn("created_at", "Created", "date")
        );
        break;

      case "commits":
        columns.push(
          createColumn("sha", "SHA"),
          createColumn("message", "Message"),
          createColumn("author.name", "Author"),
          createColumn("author.email", "Author Email"),
          createColumn("author.date", "Date", "date"),
          createColumn("stats.additions", "Additions", "number"),
          createColumn("stats.deletions", "Deletions", "number")
        );
        break;

      case "pullrequests":
        columns.push(
          createColumn("number", "Number", "number"),
          createColumn("title", "Title"),
          createColumn("state", "State"),
          createColumn("user.login", "Author"),
          createColumn("created_at", "Created", "date"),
          createColumn("updated_at", "Updated", "date"),
          createColumn("merged_at", "Merged", "date")
        );
        break;

      case "issues":
        columns.push(
          createColumn("number", "Number", "number"),
          createColumn("title", "Title"),
          createColumn("state", "State"),
          createColumn("user.login", "Author"),
          createColumn("created_at", "Created", "date"),
          createColumn("updated_at", "Updated", "date"),
          createColumn("comments", "Comments", "number")
        );
        break;

      case "users":
        columns.push(
          createColumn("login", "Login"),
          createColumn("name", "Name"),
          createColumn("email", "Email"),
          createColumn("company", "Company"),
          createColumn("location", "Location"),
          createColumn("public_repos", "Public Repos", "number"),
          createColumn("followers", "Followers", "number"),
          createColumn("following", "Following", "number")
        );
        break;

      default:
        // Dynamic column generation for unknown collections
        Object.keys(sample).forEach((key) => {
          if (key !== "_id" && key !== "__v" && key !== "integrationId") {
            columns.push(
              createColumn(key, key.charAt(0).toUpperCase() + key.slice(1))
            );
          }
        });
    }

    return columns;
  }

  async globalSearch(req, res) {
    try {
      const { userId, query } = req.params;
      const { limit = 10 } = req.query;

      // Get integration
      const integration = await Integration.findOne({
        userId: userId.toString(),
        provider: "github",
        isActive: true,
      });

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const searchPromises = [];
      const collections = [
        "organizations",
        "repositories",
        "commits",
        "pullrequests",
        "issues",
        "users",
      ];

      for (const collection of collections) {
        const Model = this.getCollectionModel(collection);
        if (Model) {
          const searchFields = this.getSearchFields(collection);
          const searchConditions = searchFields.map((field) => ({
            [field]: { $regex: query, $options: "i" },
          }));

          searchPromises.push(
            Model.find({
              integrationId: integration._id,
              $or: searchConditions,
            })
              .limit(parseInt(limit))
              .lean()
              .then((results) => ({
                collection,
                results: results.map((item) => ({
                  ...item,
                  _collection: collection,
                })),
              }))
          );
        }
      }

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.reduce((acc, curr) => {
        return acc.concat(curr.results);
      }, []);

      res.json({
        query,
        results: allResults,
        total: allResults.length,
      });
    } catch (error) {
      console.error("Global search error:", error);
      res.status(500).json({ error: "Failed to perform global search" });
    }
  }
}

module.exports = new DataController();
