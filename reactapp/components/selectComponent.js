import React, { Component, useCallback } from 'react';
import Select, { createFilter } from 'react-select';
import { FixedSizeList as List } from 'react-window';

const ROW_HEIGHT = 35;

const Outer = React.forwardRef((props, ref) => (
  <div ref={ref} {...props} style={{ ...props.style, overflowX: 'hidden' }} />
));

class MenuList extends Component {
  render() {
    const { options, children, maxHeight, getValue } = this.props;
    const renderedChildren = React.Children.toArray(children);
    const [value] = getValue();
    const initialOffset = Math.max(options.indexOf(value), 0) * ROW_HEIGHT;

    const itemCount = renderedChildren.length;
    const adjustedHeight = Math.min(itemCount * ROW_HEIGHT || ROW_HEIGHT, maxHeight);

    return (
      <List
        height={adjustedHeight}
        itemCount={itemCount}
        itemSize={ROW_HEIGHT}
        initialScrollOffset={initialOffset}
        outerElementType={Outer}
        width="100%"
      >
        {({ index, style }) => (
          <div style={style}>{renderedChildren[index]}</div>
        )}
      </List>
    );
  }
}

const customStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (provided) => ({
    ...provided,
    overflowY: 'auto',
    overflowX: 'hidden',
  }),
  option: (provided) => ({
    ...provided,
    color: 'black',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'black',
  }),
  input: (provided) => ({
    ...provided,
    color: 'black',
  }),
};

const SelectComponent = ({ optionsList, onChangeHandler }) => {
  const handleChange = useCallback((option) => {
    onChangeHandler([option]);
  }, [onChangeHandler]);

  return (
    <Select
      components={{ MenuList }}
      styles={customStyles}
      filterOption={createFilter({ ignoreAccents: false })}
      options={optionsList}
      onChange={handleChange}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuShouldScrollIntoView={false}
      menuPosition="fixed"
    />
  );
};

export default SelectComponent;
