/**
 * @file SVGHandler class implementation.
 *
 * @author Sumit Chaturvedi
 */
import React, { Component } from "react";
import addStopPropagation from "../utils/eventModifier";
import { selectColor } from "../utils/palette";
import { coveringBBox } from "../utils/svg";
import { node2ReactElement } from "../utils/reacthelpers";

class SVGHandler extends Component {
  /**
   * Create React Elements for SVG paths.
   *
   * @returns {Array}   List of graphic elements as React Elements.
   */
  graphicElements = () => {
    const { paths, defs } = this.props.graphic;
    const { onClick, onPointerOver, onPointerLeave, hover } = this.props;
    const elements = paths.map((path, key) => {
      const { fillOpacity, strokeOpacity } = path.properties;
      const hasHover = (key) => hover.length > 0 && !hover.includes(key);
      return React.createElement(path.tagName, {
        ...path.properties,
        key,
        id: `path-${key}`,
        fillOpacity: hasHover(key) ? 0.1 : fillOpacity,
        strokeOpacity: hasHover(key) ? 0.1 : strokeOpacity,
        onClick: addStopPropagation((evt) => onClick(evt, key)),
        onPointerOver: addStopPropagation(() => onPointerOver(key)),
        onPointerLeave: addStopPropagation(() => onPointerLeave(key)),
      });
    });
    if (typeof defs !== "undefined") {
      elements.splice(0, 0, node2ReactElement(defs));
    }
    return elements;
  };

  coveringBBoxOfAListOfPaths = (pathList) => {
    const { bboxes } = this.props.graphic;
    return coveringBBox(pathList.map(id => bboxes[id]));
  }

  /* Create React Elements for bounding boxes of selected paths.
   *
   * Set their event listeners and style attributes.
   *
   * @returns {Component}   A group component with the bounding boxes.
   */
  boundingBoxGroupElement = () => {
    const { graph, selected } = this.props;
    const { onClick, onPointerOver, onPointerLeave } = this.props;
    const boundingBoxes = selected.map(id => this.coveringBBoxOfAListOfPaths(graph.nodes[id].paths));
    const reactBoxes = boundingBoxes.map((bbox, i) => {
      // Use percentage for strokeWidth so that
      // it remains invariant to the SVG document's dimensions.
      //
      // Also, pointerEvents is set to "stroke" so that the
      // pointer events (such as click) are fired only when
      // we click on the boundary of the rectangles.
      const id = selected[i];
      const properties = {
        stroke: selectColor,
        strokeWidth: "2%",
        pointerEvents: "stroke",
        onClick: addStopPropagation((evt) => onClick(evt, id)),
        onPointerOver: addStopPropagation(() => onPointerOver(id)),
        onPointerLeave: addStopPropagation(() => onPointerLeave(id))
      };
      const key = `bbox-${id}`;
      // It is possible that the path is an horizontal
      // or a vertical line. In this case, the rectangle
      // won't render properly.
      //
      // Check whether the rectangle has area. If so,
      // create a rectangle bounding box. Else, simply
      // create a line to denote the bounding box.
      if (bbox.height > 0 && bbox.width > 0) {
        return (
          <rect
            key={key}
            x={bbox.x}
            y={bbox.y}
            width={bbox.width}
            height={bbox.height}
            fill="transparent"
            {...properties}
          />
        );
      } else {
        const x1 = bbox.x;
        const y1 = bbox.y;
        let x2, y2;
        if (bbox.width === 0) {
          x2 = bbox.x;
          y2 = bbox.y + bbox.height;
        } else {
          x2 = bbox.x + bbox.width;
          y2 = bbox.y;
        }
        return (
          <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...properties} />
        );
      }
    });
    return (
      <g key="bbox-group" id="bbox-group">
        {reactBoxes}
      </g>
    );
  };


  render() {
    const { svg } = this.props.graphic;
    const children = this.graphicElements();
    children.push(this.boundingBoxGroupElement());
    return React.createElement(
      svg.tagName,
      { ...svg.properties, id: "svg-element" },
      children
    );
  }
}

export default SVGHandler;