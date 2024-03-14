import React, { cloneElement } from "react";
import { SwitchTransition, CSSTransition } from "react-transition-group";

import "../css/transition.css";

function PageTransition(props) {
  const { children, page, ...rest } = props;
  console.log(children.length, page);
  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={page}
        addEndListener={(node, done) => {
          node.addEventListener("transitionend", done, false);
        }}
        classNames="transition"
      >
        {cloneElement(children[page], rest)}
      </CSSTransition>
    </SwitchTransition>
  );
}

export default PageTransition;
