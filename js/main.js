// This function basically redraws visible graph, based on nodes state
update({ x0, y0, x = 0, y = 0, width, height }) {
  const attrs = this.getChartState();
  const calc = attrs.calc;

  // Paging
  if (attrs.compact) {
      this.calculateCompactFlexDimensions(attrs.root);
  }

  //  Assigns the x and y position for the nodes
  const treeData = attrs.flexTreeLayout(attrs.root);

  // Reassigns the x and y position for the based on the compact layout
  if (attrs.compact) {
      this.calculateCompactFlexPositions(attrs.root);
  }

  const nodes = treeData.descendants();

  // console.table(nodes.map(d => ({ x: d.x, y: d.y, width: d.width, height: d.height, flexCompactDim: d.flexCompactDim + "" })))

  // Get all links
  const links = treeData.descendants().slice(1);
  nodes.forEach(attrs.layoutBindings[attrs.layout].swap)

  // Connections
  const connections = attrs.connections;
  const allNodesMap = {};
  attrs.allNodes.forEach(d => allNodesMap[attrs.nodeId(d.data)] = d);

  const visibleNodesMap = {}
  nodes.forEach(d => visibleNodesMap[attrs.nodeId(d.data)] = d);

  connections.forEach(connection => {
      const source = allNodesMap[connection.from];
      const target = allNodesMap[connection.to];
      connection._source = source;
      connection._target = target;
  })
  const visibleConnections = connections.filter(d => visibleNodesMap[d.from] && visibleNodesMap[d.to]);
  const defsString = attrs.defs.bind(this)(attrs, visibleConnections);
  const existingString = attrs.defsWrapper.html();
  if (defsString !== existingString) {
      attrs.defsWrapper.html(defsString)
  }

  // --------------------------  LINKS ----------------------
  // Get links selection
  const linkSelection = attrs.linksWrapper
      .selectAll("path.link")
      .data(links, (d) => attrs.nodeId(d.data));

  // Enter any new links at the parent's previous position.
  const linkEnter = linkSelection
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", (d) => {
          const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x: x0, y: y0, width, height });
          const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x: x0, y: y0, width, height });
          const o = { x: xo, y: yo };
          return attrs.layoutBindings[attrs.layout].diagonal(o, o, o);
      });

  // Get links update selection
  const linkUpdate = linkEnter.merge(linkSelection);

  // Styling links
  linkUpdate
      .attr("fill", "none")


  if (this.isEdge()) {
      linkUpdate
          .style('display', d => {
              const display = d.data._pagingButton ? 'none' : 'auto'
              return display;
          })
  } else {
      linkUpdate
          .attr('display', d => {
              const display = d.data._pagingButton ? 'none' : 'auto'
              return display;
          })
  }

  // Allow external modifications
  linkUpdate.each(attrs.linkUpdate);

  // Transition back to the parent element position
  linkUpdate
      .transition()
      .duration(attrs.duration)
      .attr("d", (d) => {
          const n = attrs.compact && d.flexCompactDim ?
              {
                  x: attrs.layoutBindings[attrs.layout].compactLinkMidX(d, attrs),
                  y: attrs.layoutBindings[attrs.layout].compactLinkMidY(d, attrs)
              } :
              {
                  x: attrs.layoutBindings[attrs.layout].linkX(d),
                  y: attrs.layoutBindings[attrs.layout].linkY(d)
              };

          const p = {
              x: attrs.layoutBindings[attrs.layout].linkParentX(d),
              y: attrs.layoutBindings[attrs.layout].linkParentY(d),
          };

          const m = attrs.compact && d.flexCompactDim ? {
              x: attrs.layoutBindings[attrs.layout].linkCompactXStart(d),
              y: attrs.layoutBindings[attrs.layout].linkCompactYStart(d),
          } : n;
          return attrs.layoutBindings[attrs.layout].diagonal(n, p, m, { sy: attrs.linkYOffset });
      });

  // Remove any  links which is exiting after animation
  const linkExit = linkSelection
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr("d", (d) => {
          const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x, y, width, height });
          const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x, y, width, height });
          const o = { x: xo, y: yo };
          return attrs.layoutBindings[attrs.layout].diagonal(o, o, null, { sy: attrs.linkYOffset });
      })
      .remove();


  // --------------------------  CONNECTIONS ----------------------

  const connectionsSel = attrs.connectionsWrapper
      .selectAll("path.connection")
      .data(visibleConnections)

  // Enter any new connections at the parent's previous position.
  const connEnter = connectionsSel
      .enter()
      .insert("path", "g")
      .attr("class", "connection")
      .attr("d", (d) => {
          const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x: x0, y: y0, width, height });
          const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x: x0, y: y0, width, height });
          const o = { x: xo, y: yo };
          return attrs.layoutBindings[attrs.layout].diagonal(o, o, null, { sy: attrs.linkYOffset });
      });


  // Get connections update selection
  const connUpdate = connEnter.merge(connectionsSel);

  // Styling connections
  connUpdate.attr("fill", "none")

  // Transition back to the parent element position
  connUpdate
      .transition()
      .duration(attrs.duration)
      .attr('d', (d) => {
          const xs = attrs.layoutBindings[attrs.layout].linkX({ x: d._source.x, y: d._source.y, width: d._source.width, height: d._source.height });
          const ys = attrs.layoutBindings[attrs.layout].linkY({ x: d._source.x, y: d._source.y, width: d._source.width, height: d._source.height });
          const xt = attrs.layoutBindings[attrs.layout].linkJoinX({ x: d._target.x, y: d._target.y, width: d._target.width, height: d._target.height });
          const yt = attrs.layoutBindings[attrs.layout].linkJoinY({ x: d._target.x, y: d._target.y, width: d._target.width, height: d._target.height });
          return attrs.linkGroupArc({ source: { x: xs, y: ys }, target: { x: xt, y: yt } })
      })

  // Allow external modifications
  connUpdate.each(attrs.connectionsUpdate);

  // Remove any  links which is exiting after animation
  const connExit = connectionsSel
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr('opacity', 0)
      .remove();

  // --------------------------  NODES ----------------------
  // Get nodes selection
  const nodesSelection = attrs.nodesWrapper
      .selectAll("g.node")
      .data(nodes, ({ data }) => attrs.nodeId(data));

  // Enter any new nodes at the parent's previous position.
  const nodeEnter = nodesSelection
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
          if (d == attrs.root) return `translate(${x0},${y0})`
          const xj = attrs.layoutBindings[attrs.layout].nodeJoinX({ x: x0, y: y0, width, height });
          const yj = attrs.layoutBindings[attrs.layout].nodeJoinY({ x: x0, y: y0, width, height });
          return `translate(${xj},${yj})`
      })
      .attr("cursor", "pointer")
      .on("click.node", (event, node) => {
          const { data } = node;
          if ([...event.srcElement.classList].includes("node-button-foreign-object")) {
              return;
          }
          if ([...event.srcElement.classList].includes("paging-button-wrapper")) {
              this.loadPagingNodes(node);
              return;
          }
          if (!data._pagingButton) {
              attrs.onNodeClick(node);
              return;
          }
          console.log('event fired, no handlers')
      })
      //  Event handler to the expand button
      .on("keydown.node", (event, node) => {
          const { data } = node;
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
              if ([...event.srcElement.classList].includes("node-button-foreign-object")) {
                  return;
              }
              if ([...event.srcElement.classList].includes("paging-button-wrapper")) {
                  this.loadPagingNodes(node);
                  return;
              }
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                  this.onButtonClick(event, node)
              }
          }
      });
  nodeEnter.each(attrs.nodeEnter)

  // Add background rectangle for the nodes
  nodeEnter
      .patternify({
          tag: "rect",
          selector: "node-rect",
          data: (d) => [d]
      })

  // Node update styles
  const nodeUpdate = nodeEnter
      .merge(nodesSelection)
      .style("font", "12px sans-serif");

  // Add foreignObject element inside rectangle
  const fo = nodeUpdate.patternify({
      tag: "foreignObject",
      selector: "node-foreign-object",
      data: (d) => [d]
  })
      .style('overflow', 'visible')

  // Add foreign object
  fo.patternify({
      tag: "xhtml:div",
      selector: "node-foreign-object-div",
      data: (d) => [d]
  })

  this.restyleForeignObjectElements();

  // Add Node button circle's group (expand-collapse button)
  const nodeButtonGroups = nodeEnter
      .patternify({
          tag: "g",
          selector: "node-button-g",
          data: (d) => [d]
      })
      .on("click", (event, d) => this.onButtonClick(event, d))
      .on("keydown", (event, d) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
              this.onButtonClick(event, d)
          }
      });

  nodeButtonGroups.patternify({
      tag: 'rect',
      selector: 'node-button-rect',
      data: (d) => [d]
  })
      .attr('opacity', 0)
      .attr('pointer-events', 'all')
      .attr('width', d => attrs.nodeButtonWidth(d))
      .attr('height', d => attrs.nodeButtonHeight(d))
      .attr('x', d => attrs.nodeButtonX(d))
      .attr('y', d => attrs.nodeButtonY(d))

  // Add expand collapse button content
  const nodeFo = nodeButtonGroups
      .patternify({
          tag: "foreignObject",
          selector: "node-button-foreign-object",
          data: (d) => [d]
      })
      .attr('width', d => attrs.nodeButtonWidth(d))
      .attr('height', d => attrs.nodeButtonHeight(d))
      .attr('x', d => attrs.nodeButtonX(d))
      .attr('y', d => attrs.nodeButtonY(d))
      .style('overflow', 'visible')
      .patternify({
          tag: "xhtml:div",
          selector: "node-button-div",
          data: (d) => [d]
      })
      .style('pointer-events', 'none')
      .style('display', 'flex')
      .style('width', '100%')
      .style('height', '100%')



  // Transition to the proper position for the node
  nodeUpdate
      .transition()
      .attr("opacity", 0)
      .duration(attrs.duration)
      .attr("transform", ({ x, y, width, height }) => {
          return attrs.layoutBindings[attrs.layout].nodeUpdateTransform({ x, y, width, height });

      })
      .attr("opacity", 1);

  // Style node rectangles
  nodeUpdate
      .select(".node-rect")
      .attr("width", ({ width }) => width)
      .attr("height", ({ height }) => height)
      .attr("x", ({ width }) => 0)
      .attr("y", ({ height }) => 0)
      .attr("cursor", "pointer")
      .attr('rx', 3)
      .attr("fill", attrs.nodeDefaultBackground)


  nodeUpdate.select(".node-button-g").attr("transform", ({ data, width, height }) => {
      const x = attrs.layoutBindings[attrs.layout].buttonX({ width, height });
      const y = attrs.layoutBindings[attrs.layout].buttonY({ width, height });
      return `translate(${x},${y})`
  })
      .attr("display", ({ data }) => {
          return data._directSubordinates > 0 ? null : 'none';
      })
      .attr("opacity", ({ data, children, _children }) => {
          if (data._pagingButton) {
              return 0;
          }
          if (children || _children) {
              return 1;
          }
          return 0;
      });

  // Restyle node button circle
  nodeUpdate
      .select(".node-button-foreign-object .node-button-div")
      .html((node) => {
          return attrs.buttonContent({ node, state: attrs })
      })

  // Restyle button texts
  nodeUpdate
      .select(".node-button-text")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", ({ children }) => {
          if (children) return 40;
          return 26;
      })
      .text(({ children }) => {
          if (children) return "-";
          return "+";
      })
      .attr("y", this.isEdge() ? 10 : 0);

  nodeUpdate.each(attrs.nodeUpdate)

  // Remove any exiting nodes after transition
  const nodeExitTransition = nodesSelection
      .exit()
  nodeExitTransition.each(attrs.nodeExit)

  const maxDepthNode = nodeExitTransition.data().reduce((a, b) => a.depth < b.depth ? a : b, { depth: Infinity });

  nodeExitTransition.attr("opacity", 1)
      .transition()
      .duration(attrs.duration)
      .attr("transform", (d) => {

          let { x, y, width, height } = maxDepthNode.parent || {};
          const ex = attrs.layoutBindings[attrs.layout].nodeJoinX({ x, y, width, height });
          const ey = attrs.layoutBindings[attrs.layout].nodeJoinY({ x, y, width, height });
          return `translate(${ex},${ey})`
      })
      .on("end", function () {
          d3.select(this).remove();
      })
      .attr("opacity", 0);

  // Store the old positions for transition.
  nodes.forEach((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
  });

  // CHECK FOR CENTERING
  const centeredNode = attrs.allNodes.filter(d => d.data._centered)[0]
  if (centeredNode) {
      let centeredNodes = [centeredNode]
      if (centeredNode.data._centeredWithDescendants) {
          if (attrs.compact) {
              centeredNodes = centeredNode.descendants().filter((d, i) => i < 7);
          } else {
              centeredNodes = centeredNode.descendants().filter((d, i, arr) => {
                  const h = Math.round(arr.length / 2);
                  const spread = 2;
                  if (arr.length % 2) {
                      return i > h - spread && i < h + spread - 1;
                  }

                  return i > h - spread && i < h + spread;
              });
          }

      }
      centeredNode.data._centeredWithDescendants = null;
      centeredNode.data._centered = null;
      this.fit({
          animate: true,
          scale: false,
          nodes: centeredNodes
      })
  }

}
