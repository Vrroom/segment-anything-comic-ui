import React, { Component } from "react";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import { highlightColor, rgb2string } from "../utils/palette";
import { isUndef } from "../utils/misc.js";
import alphaBlink from "../utils/math";

class IconButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      x: 0,
    };
    if (props.highlight) {
      this.counter = setInterval(this.increment, 40);
    }
  }

  increment = () => {
    this.setState((prevState) => {
      const { x } = prevState;
      return { x: x + 1 };
    });
  };

  componentDidUpdate(prevProps) {
    if (prevProps.highlight !== this.props.highlight) {
      if (this.props.highlight) {
        this.counter = setInterval(this.increment, 40);
      } else if (!isUndef(this.counter)) {
        clearInterval(this.counter);
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.counter);
  }

  render() {
    const { active, children, highlight, onClick } = this.props;
    let { variant } = this.props;
    if (isUndef(variant)) {
      variant = "light";
    }
    const style = {};
    if (highlight) {
      const alpha = alphaBlink(this.state.x);
      const color = rgb2string(highlightColor, alpha);
      style["boxShadow"] = `0 0 0 .6rem ${color}`;
    }
    return (
      <Row className="mt-3 mb-3" >
        <Col className="d-flex justify-content-center">
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 250, hide: 400 }}
            overlay={<Tooltip>{this.props.name}</Tooltip>}
          >
            <div className={active ? "visible" : "invisible"}>
              <Button variant={variant} style={style} onClick={onClick}>
                {children}
              </Button>
            </div>
          </OverlayTrigger>
        </Col>
      </Row>
    );
  }
}

export default IconButton;
