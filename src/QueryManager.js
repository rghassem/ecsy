import Query from "./Query.js";
import { queryKey } from "./Utils.js";

/**
 * @private
 * @class QueryManager
 */
export default class QueryManager {
  constructor(world) {
    this._world = world;

    // Queries indexed by a unique identifier for the components it has
    this._queries = {};
    this.componentsToQueries = new Map();
  }

  onEntityRemoved(entity) {
    for (var queryName in this._queries) {
      var query = this._queries[queryName];
      if (entity.queries.indexOf(query) !== -1) {
        query.removeEntity(entity);
      }
    }
  }

  /**
   * Callback when a component is added to an entity
   * @param {Entity} entity Entity that just got the new component
   * @param {Component} Component Component added to the entity
   */
  onEntityComponentAdded(entity, Component) {
    // @todo Use bitmask for checking components?

    // Check each indexed query to see if we need to add this entity to the list
    const candidates = this.componentsToQueries.get(Component);
    if (!candidates) { return; };
    for (const query of candidates) {
      if (
        !!~query.NotComponents.indexOf(Component) &&
        query.hasEntity(entity)
      ) {
        query.removeEntity(entity);
        continue;
      }

      // Add the entity only if:
      // Component is in the query
      // and Entity has ALL the components of the query
      // and Entity is not already in the query
      if (
        !~query.Components.indexOf(Component) ||
        !query.match(entity) ||
        query.hasEntity(entity)
      )
        continue;

      query.addEntity(entity);
    }
  }

  /**
   * Callback when a component is removed from an entity
   * @param {Entity} entity Entity to remove the component from
   * @param {Component} Component Component to remove from the entity
   */
  onEntityComponentRemoved(entity, Component) {
    const candidates = this.componentsToQueries.get(Component);
    if (!candidates) return;
    for (const query of candidates) {

      if (
        !!~query.NotComponents.indexOf(Component) &&
        !query.hasEntity(entity) &&
        query.match(entity)
      ) {
        query.addEntity(entity);
        continue;
      }

      if (
        !!~query.Components.indexOf(Component) &&
        query.hasEntity(entity) &&
        !query.match(entity)
      ) {
        query.removeEntity(entity);
        continue;
      }
    }
  }

  /**
   * Get a query for the specified components
   * @param {Component} Components Components that the query should have
   */
  getQuery(Components) {
    var key = queryKey(Components);
    var query = this._queries[key];
    if (!query) {
      this._queries[key] = query = new Query(Components, this._world);
      for (let component of Components) {

        //Extract the component from NotComponents
        if (typeof component === "object") {
          component = component.Component;
        }

        if (!this.componentsToQueries.has(component)) {
          this.componentsToQueries.set(component, []);
        }
        this.componentsToQueries.get(component).push(query);
      }
    }
    return query;
  }

  /**
   * Return some stats from this class
   */
  stats() {
    var stats = {};
    for (var queryName in this._queries) {
      stats[queryName] = this._queries[queryName].stats();
    }
    return stats;
  }
}
