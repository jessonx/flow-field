/**
 * @source https://github.com/martinwells/gamecore.js
 */

/**
 * @description
 * Represents an item stored in a linked list.
 */
LinkedListNode = function() {
	this.obj = null; // the object reference
	this.next = null; // link to next object in the list
	this.prev = null; // link to previous object in the list
	this.free = true;
};

/**
 * @description
 * A high-speed doubly linked list of objects. Note that for speed reasons (using a dictionary lookup of
 * cached nodes) there can only be a single instance of an object in the list at the same time. Adding the same
 * object a second time will result in a silent return from the add method.
 * <p>
 * In order to keep a track of node links, an object must be able to identify itself with a uniqueId function.
 * <p>
 * To add an item use:
 * <pre><code>
 *   list.add(newItem);
 * </code></pre>
 * <p>
 * You can iterate using the first and next members, such as:
 * <pre><code>
 *   var node = list.first;
 *   while (node)
 *   {
 *       node.object().DOSOMETHING();
 *       node = node.next();
 *   }
 * </code></pre>
 */
LinkedList = function() {
	this.first = null;
	this.last = null;
	this.length = 0;
	this.objToNodeMap = {}; // a quick lookup list to map linked list nodes to objects
	this.uniqueId = Date.now() + '' + Math.floor(Math.random()*1000);
	
	/**
	 * Get the LinkedListNode for this object.
	 * @param obj The object to get the node for
	 */
	this.getNode = function (obj) {
		// objects added to a list must implement a getUniqueId which returns a unique object identifier string
		return this.objToNodeMap[obj.uniqueId];
	};

	/**
	 * Adds a specific node to the list -- typically only used internally unless you're doing something funky
	 * Use add() to add an object to the list, not this.
	 */
	this.addNode = function (obj) {
		var node = new LinkedListNode();
		node.obj = obj;
		node.prev = null;
		node.next = null;
		node.free = false;
		this.objToNodeMap[obj.uniqueId] = node;
		return node;
	};

	/**
	 * Add an item to the list
	 * @param obj The object to add
	 */
	this.add = function (obj) {
		var node = this.objToNodeMap[obj.uniqueId];
		
		if (!node) {
			node = this.addNode(obj);
		} else {
			if (node.free === false) return;
			
			// reusing a node, so we clean it up
			// this caching of node/object pairs is the reason an object can only exist
			// once in a list -- which also makes things faster (not always creating new node
			// object every time objects are moving on and off the list
			node.obj = obj;
			node.free = false;
			node.next = null;
			node.prev = null;
		}

		// append this obj to the end of the list
		if (!this.first) { // is this the first?
			this.first = node;
			this.last = node;
			node.next = null; // clear just in case
			node.prev = null;
		} else {
			if (this.last == null) {
				throw new Error("Hmm, no last in the list -- that shouldn't happen here");
			}

			// add this entry to the end of the list
			this.last.next = node; // current end of list points to the new end
			node.prev = this.last;
			this.last = node;            // new object to add becomes last in the list
			node.next = null;      // just in case this was previously set
		}
		this.length++;

		if (this.showDebug) this.dump('after add');
	};

	this.has = function (obj) {
		return !!this.objToNodeMap[obj.uniqueId];
	};

	/**
	 * Moves this item upwards in the list
	 * @param obj
	 */
	this.moveUp = function (obj) {
		this.dump('before move up');
		var c = this.getNode(obj);
		if (!c) throw "Oops, trying to move an object that isn't in the list";
		if (c.prev == null) return; // already first, ignore

		// This operation makes C swap places with B:
		// A <-> B <-> C <-> D
		// A <-> C <-> B <-> D

		var b = c.prev;
		var a = b.prev;

		// fix last
		if (c == this.last) this.last = b;

		var oldCNext = c.next;

		if (a) a.next = c;
		c.next = b;
		c.prev = b.prev;

		b.next = oldCNext;
		b.prev = c;

		// check to see if we are now first
		if (this.first == b) this.first = c;
	};

	/**
	 * Moves this item downwards in the list
	 * @param obj
	 */
	this.moveDown = function (obj) {
		var b = this.getNode(obj);
		if (!b) throw "Oops, trying to move an object that isn't in the list";
		if (b.next == null) return; // already last, ignore

		// This operation makes B swap places with C:
		// A <-> B <-> C <-> D
		// A <-> C <-> B <-> D

		var c = b.next;
		this.moveUp(c.obj);

		// check to see if we are now last
		if (this.last == c) this.last = b;
	};
	
	/**
	 * Take everything off the list and put it in an array, sort it, then put it back.
	 */
	this.sort = function (compare) {
		var sortArray = [];
		var i, l, node = this.first;
		
		while (node) {
			sortArray.push(node.object());
			node = node.next();
		}
		
		this.clear();
		
		sortArray.sort(compare);

		l = sortArray.length;
		for (i = 0; i < l; i++) {
			this.add(sortArray[i]);
		}
	};

	/**
	 * Removes an item from the list
	 * @param obj The object to remove
	 * @returns boolean true if the item was removed, false if the item was not on the list
	 */
	this.remove = function (obj) {
		var node = this.getNode(obj);
		if (node == null || node.free == true){
			return false; // ignore this error (trying to remove something not there)
		}

		// pull this object out and tie up the ends
		if (node.prev != null)
			node.prev.next = node.next;
		if (node.next != null)
			node.next.prev = node.prev;

		// fix first and last
		if (node.prev == null) // if this was first on the list
			this.first = node.next; // make the next on the list first (can be null)
		if (node.next == null) // if this was the last
			this.last = node.prev; // then this node's previous becomes last

		node.free = true;
		node.prev = null;
		node.next = null;

		this.length--;
		
		return true;
	};
	
	// remove the head and return it's object
	this.shift = function() {
		var node = this.first;
		if (this.length === 0) return null;
		// if (node == null || node.free == true) return null;

		// pull this object out and tie up the ends
		if (node.prev) {
			node.prev.next = node.next;
		}
		if (node.next) {
			node.next.prev = node.prev;
		}
		
		// make the next on the list first (can be null)
		this.first = node.next;
		if (!node.next) this.last = null; // make sure we clear this
		
		node.free = true;
		node.prev = null;
		node.next = null;

		this.length--;
		return node.obj;
	};
	
	// remove the tail and return it's object
	this.pop = function() {
		var node = this.last;
		if (this.length === 0) return null;

		// pull this object out and tie up the ends
		if (node.prev) {
			node.prev.next = node.next;
		}
		if (node.next) {
			node.next.prev = node.prev;
		}
		
		// this node's previous becomes last
		this.last = node.prev;
		if (!node.prev) this.first = null; // make sure we clear this
		
		node.free = true;
		node.prev = null;
		node.next = null;

		this.length--;
		return node.obj;
	};

	/**
	 * Clears the list out
	 */
	this.clear = function() {
		var next = this.first;
		
		while (next) {
			next.free = true;
			next = next.next;
		}
		
		this.first = null;
		this.length = 0;
	};
	
	this.destroy = function() {
		var next = this.first;
		
		while (next) {
			next.obj = null;
			next = next.next;
		}
		this.first = null;
		
		this.objToNodeMap = null;
	};

	/**
	 * Outputs the contents of the current list for debugging.
	 */
	this.dump = function(msg) {
		console.log('====================' + msg + '=====================');
		var a = this.first;
		while (a != null) {
			console.log("{" + a.obj.toString() + "} previous=" + ( a.prev ? a.prev.obj : "NULL"));
			a = a.next();
		}
		console.log("===================================");
		console.log("Last: {" + (this.last ? this.last.obj : 'NULL') + "} " +
			"First: {" + (this.first ? this.first.obj : 'NULL') + "}");
	};
};
