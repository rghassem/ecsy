import EventDispatcher from "./EventDispatcher.js";
import { queryKey } from "./Utils.js";

export default class Query {
  /**
   * @param {Array(Component)} Components List of types of components to query
   */
  constructor(Components, manager) {
    this.Components = [];
    this.NotComponents = [];

    Components.forEach(component => {
      if (typeof component === "object") {
        this.NotComponents.push(component.Component);
      } else {
        this.Components.push(component);
      }
    });

    if (this.Components.length === 0) {
      throw new Error("Can't create a query without components");
    }

    this.entities = [];

    this.eventDispatcher = new EventDispatcher();

    // This query is being used by a reactive system
    this.reactive = false;

    this.key = queryKey(Components);

    // Fill the query with the existing entities
    for (var i = 0; i < manager._entities.length; i++) {
      var entity = manager._entities[i];
      if (this.match(entity)) {
        // @todo ??? this.addEntity(entity); => preventing the event to be generated
        const length = this.entities.push(entity);
        entity.queries.set(this, length - 1);
      }
    }
  }

  /**
   * Add entity to this query
   * @param {Entity} entity
   */
  addEntity(entity) {
    const length = this.entities.push(entity);
    entity.queries.set(this, length - 1);

    this.eventDispatcher.dispatchEvent(Query.prototype.ENTITY_ADDED, entity);
  }

  /**
   * Remove entity from this query
   * @param {Entity} entity
   */
  removeEntity(entity) {
    if (this.hasEntity(entity)) {
      const index = entity.queries.get(this);

      //swap with last element of entities before removing in order to prevent disturbing other indices
      const lastEntity = this.entities.pop();
      if (lastEntity !== entity) {
        this.entities[index] = lastEntity;
        lastEntity.queries.set(this, index);
      }

      entity.queries.delete(this);


      //Defend against entity added and removed in the same frame causing invalid added query result
      if (this.addedSet && this.added && this.addedSet.has(entity)) {
        this.addedSet.delete(entity);
        this.added.splice(this.added.indexOf(entity), 1);
      }

      this.eventDispatcher.dispatchEvent(
        Query.prototype.ENTITY_REMOVED,
        entity
      );
    }
  }

  hasEntity(entity) {
    return entity.queries.has(this);
  }

  match(entity) {
    return (
      entity.hasAllComponents(this.Components) &&
      !entity.hasAnyComponents(this.NotComponents)
    );
  }

  toJSON() {
    return {
      key: this.key,
      reactive: this.reactive,
      components: {
        included: this.Components.map(C => C.name),
        not: this.NotComponents.map(C => C.name)
      },
      numEntities: this.entities.length
    };
  }

  /**
   * Return stats for this query
   */
  stats() {
    return {
      numComponents: this.Components.length,
      numEntities: this.entities.length
    };
  }
}

Query.prototype.ENTITY_ADDED = "Query#ENTITY_ADDED";
Query.prototype.ENTITY_REMOVED = "Query#ENTITY_REMOVED";
Query.prototype.COMPONENT_CHANGED = "Query#COMPONENT_CHANGED";
