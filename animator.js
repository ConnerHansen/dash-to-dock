const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Tweener = imports.ui.tweener;

const animConfigs = {
  bouncy: {
    easing: "easeOutElastic",
    timing: 1.6
  },
  firm: {
    easing: "easeOutBounce",
    timing: 0.3
  },
  snappy: {
    easing: "easeOutQuint",
    timing: 0.2
  },
  soft: {
    easing: "easeOutBack",
    timing: 0.4
  }
};

const animKeys = Object.keys(animConfigs);

const DESATURATION_FACTOR = {
  active: 0.0,
  hover: 0.5,
  inactive: 0.8
};

var AnimatorConst = {
  desaturation: {
    active: 0.0,
    hover: 0.5,
    inactive: 0.8
  }
}

/**
 * Animator contains the core animation components
 */
var Animator = {
  DESATURATION_FACTOR: {
    active: 0.0,
    hover: 0.5,
    inactive: 0.8
  },

  /**
   * _getIconScaleOffset gets the scaled difference in pixels between an icon and
   * the requested transformed size
   */
  _getIconScaleOffset: function(appIcon, scale) {
    // let rect = new Meta.Rectangle();
    //
    // [rect.x, rect.y] = appIcon.actor.get_transformed_position();
    // [rect.width, rect.height] = appIcon.actor.get_transformed_size();
    // appIcon._originalSize = rect.width;
    //
    // return Math.floor((appIcon._originalSize * scale) - appIcon._originalSize);
    return 30 * (scale - 1.0);
  },

  /**
   * renderFlat renders the icon state using the flat rendering algorithm
   */
  _renderFlat: function(appIcon, state) {
    let color1 = appIcon.colorScheme.original,
      color2 = appIcon.colorScheme.darker,
      opacity = "1.0",
      scaleAmount = appIcon._dtdSettings.get_double('dash-icon-scale');

    Animator.updateIconSize(appIcon, state);
    if (appIcon._state == "active") {
      opacity = "0.85";
    } else if (state == "hover") {
      opacity = "0.65";
    } else if (state == "inactive") {
      opacity = "0.45";
    }

    if (state == "hover") {
      if (appIcon._state == "active") {
        color1 = appIcon.colorScheme.original;
        color2 = appIcon.colorScheme.lighter;
      } else {
        color1 = appIcon.colorScheme.original;
        color2 = appIcon.colorScheme.original;
      }
    } else if (state == "active") {
      color1 = appIcon.colorScheme.dim;
      color2 = appIcon.colorScheme.lighter;
    }

    appIcon._iconContainer.set_style(
        // 'margin-top: ' + scaleAmount * scaleAmount * 8 + 'px;' +
        // 'margin-top: 15px;' +
        `margin-top: ${scaleAmount * 10}px;` +
        'margin-right: 5px;' +
        'border: 1px solid rgba(' + color1 + ', 0.5);' +
        // 'box-shadow: inset 10px 10px 10px rgba(0, 0, 0, 0.2);' +
        'background-gradient-direction: radial;' +
        'background-gradient-start: rgba(' + color1 + ', ' + opacity + ');' +
        'background-gradient-end: rgba(' + color2 + ', ' + opacity + ');'
    );

    appIcon._dot.set_style(
        'height: 0px;' +
        'border: 0px solid rgb(' + appIcon.colorScheme.lighter  + ');' +
        'background-color: rgb(' + appIcon.colorScheme.original + ');'
    );
  },

  /**
   * renderFlat renders the icon state using the glow rendering algorithm
   */
  _renderGlow: function(appIcon, state) {
    let opacity = "1.0",
      color1 = appIcon.colorScheme.lighter,
      color2 = appIcon.colorScheme.original,
      scaleAmount = appIcon._dtdSettings.get_double('dash-icon-scale');

    Animator.updateIconSize(appIcon, state);
    if (appIcon._state == "active") {
      opacity = "1.0";

      if (state == "hover")
        color2 = appIcon.colorScheme.lighter;
    } else if (state == "hover") {
      opacity = "0.5";
    } else if (state == "inactive") {
      opacity = "0.3";
    }

    // TODO: fix this hack, it's stupid to guess at it like this. Scale based
    // on the selected icon size and maximum scale factor instead
    appIcon._iconContainer.set_style(
        // 'margin-top: ' + scaleAmount * scaleAmount * 8 + 'px;' +
        // 'margin-top: 5px;' +
        'margin-right: ' + scaleAmount * scaleAmount * scaleAmount + 'px;' +
        'border-radius: 20px;' +
        'background-gradient-direction: radial;' +
        'background-gradient-start: rgba(' + color1 + ', ' + opacity + ');' +
        'background-gradient-end: rgba(' + color2 + ', 0.0);'
    );

    appIcon._dot.set_style(
        'height: 0px;' +
        'border: 0px solid rgb(' + appIcon.colorScheme.original  + ');' +
        'background-color: rgb(' + appIcon.colorScheme.darker + ');'
    );
  },

  /**
   * updateIconBackground updates the icon background to the applicable state
   * and style
   */
  updateIconBackground: function(appIcon, state, style) {
    if (!appIcon.colorScheme)
      return;

    if (style === "flat") {
      Animator._renderFlat(appIcon, state);
    } else if (style == "glow") {
      Animator._renderGlow(appIcon, state);
    }

    let factor = AnimatorConst.desaturation.inactive;
    if (appIcon._state == "active") {
      factor = AnimatorConst.desaturation.active;
    } else if (state == "hover") {
      factor = AnimatorConst.desaturation.hover;
    }

    if (appIcon._colorDesaturation) {
      Tweener.addTween(appIcon._colorDesaturation, {
        factor: factor,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });
    } else {
      global.log("d2d: colorSaturation is not defined");
    }
  },

  /**
   * updateIconSize updates the current size of the icon base on the state
   */
  updateIconSize: function(appIcon, state) {
    // appIcon.icon.actor.scale_gravity = Clutter.Gravity.CENTER;
    if (!appIcon._animConfig)
      appIcon._animConfig = animConfigs["snappy"];

    if (state == "inactive") {
      let scale = 1.0;

      Tweener.addTween(appIcon.icon.actor, {
        // opacity: 200,
        translation_x: 0,
        translation_y: 0,
        scale_x: 1.0,
        scale_y: 1.0,
        // rotation_angle_z: 0,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });

      // Tweener.addTween(appIcon._iconContainer, {
      //   translation_y: 90,
      //   time: appIcon._animConfig.timing,
      //   transition: appIcon._animConfig.easing
      // });
    } else if (state == "active" || appIcon._state == "active") {
      let scale = appIcon._dtdSettings.get_double('dash-icon-scale'),
        offset = 0;

      if (state === "hover")
        scale *= 1.05;

      offset = Animator._getIconScaleOffset(appIcon, scale);
      Tweener.addTween(appIcon.icon.actor, {
        // opacity: 255,
        // translation_x: offset,
        translation_y: -offset,
        scale_x: scale,
        scale_y: scale,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });
    } else if (state == "hover" && appIcon._state != "active") {
      let iconScale = appIcon._dtdSettings.get_double('dash-icon-scale'),
        scale = 1 + (0.75 * (iconScale - 1)),
        offset = 0;

      offset = Animator._getIconScaleOffset(appIcon, scale);
      // appIcon.icon.actor.rotation_angle_z = 20;
      Tweener.addTween(appIcon.icon.actor, {
        // translation_x: offset,
        translation_y: -offset * 0.5,
        scale_x: scale,
        scale_y: scale,
        // rotation_angle_z: 0,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });

      // Tweener.addTween(appIcon._iconContainer, {
      //   translation_y: 0,
      //   time: appIcon._animConfig.timing,
      //   transition: appIcon._animConfig.easing
      // });
    }
  }
};
