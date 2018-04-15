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
global.log("*********************");
const animKeys = Object.keys(animConfigs);

const DESATURATION_FACTOR = {
  active: 0.0,
  hover: 0.5,
  inactive: 0.8
};

/**
 * Animator contains the core animation components
 */
var Animator = {

  /**
   * _getIconScaleOffset gets the scaled difference in pixels between an icon and
   * the requested transformed size
   */
  _getIconScaleOffset: function(appIcon, scale) {
    let rect = new Meta.Rectangle();

    [rect.x, rect.y] = appIcon.actor.get_transformed_position();
    [rect.width, rect.height] = appIcon.actor.get_transformed_size();
    appIcon._originalSize = rect.width;

    return ((appIcon._originalSize * scale) - appIcon._originalSize);
  },

  /**
   * renderFlat renders the icon state using the flat rendering algorithm
   */
  _renderFlat: function(appIcon, state) {
    let color1 = appIcon.colorScheme.original,
      color2 = appIcon.colorScheme.darker,
      opacity = "1.0",
      scaleAmount = appIcon._dtdSettings.get_double('dash-icon-scale');

    if (appIcon._state == "active") {
      opacity = "0.85";
    } else if (state == "hover") {
      opacity = "0.65";
    } else if (state == "inactive") {
      opacity = "0.45";
    }

    if (state == "hover") {
      color1 = appIcon.colorScheme.darker;
      color2 = appIcon.colorScheme.darker;
    } else if (state == "active") {
      color1 = appIcon.colorScheme.darker;
      color2 = appIcon.colorScheme.original;
    }

    appIcon._iconContainer.set_style(
        'margin-top: ' + scaleAmount * scaleAmount * 8 + 'px;' +
        'margin-right: 5px;' +
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

  _renderGlow: function(appIcon, state) {
    let opacity = "1.0",
      color1 = appIcon.colorScheme.lighter,
      color2 = appIcon.colorScheme.original,
      scaleAmount = appIcon._dtdSettings.get_double('dash-icon-scale');

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
        'margin-top: ' + scaleAmount * scaleAmount * 8 + 'px;' +
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
    let bgStyle = "flat";

    Animator.updateIconSize(appIcon, state);
    if (!appIcon.colorScheme)
      return;

    if (bgStyle === "flat") {
      Animator._renderFlat(appIcon, state);
    } else if (bgStyle == "glow") {
      Animator._renderGlow(appIcon, state);
    }

    let factor = DESATURATION_FACTOR.inactive;
    if (appIcon._state == "active") {
      factor = DESATURATION_FACTOR.active;
    } else if (state == "hover") {
      factor = DESATURATION_FACTOR.hover;
    }

    if (appIcon._colorDesaturation) {
      Tweener.addTween(appIcon._colorDesaturation, {
        factor: factor,
        time: 0.25,
        transition: 'easeInExpo',
      });
    } else {
      global.log("d2d: colorSaturation is not defined");
    }
  },

  /**
   * updateIconSize updates the current size of the icon base on the state
   */
  updateIconSize: function(appIcon, state) {
    appIcon.icon.actor.scale_gravity = Clutter.Gravity.SOUTH;
    if (!appIcon._animConfig)
      appIcon._animConfig = animConfigs["snappy"];

    if (state == "inactive") {
      let scale = 1.0;

      Tweener.addTween(appIcon.icon.actor, {
        translation_x: 0,
        translation_y: 0,
        scale_x: 1.0,
        scale_y: 1.0,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });
    } else if (state == "active") {
      let scale = appIcon._dtdSettings.get_double('dash-icon-scale'),
        offset = 0;

      offset = Animator._getIconScaleOffset(appIcon, scale) / 2;
      Tweener.addTween(appIcon.icon.actor, {
        translation_y: -offset / 2,
        scale_x: scale,
        scale_y: scale,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });
    } else if (state == "hover" && appIcon._state != "active") {
      let iconScale = appIcon._dtdSettings.get_double('dash-icon-scale'),
        scale = 1 + (0.75 * (iconScale - 1)),
        offset = 0;

      offset = Animator._getIconScaleOffset(appIcon, scale) / 2;
      Tweener.addTween(appIcon.icon.actor, {
        // translation_x: -offset,
        translation_y: -offset / 2,
        scale_x: scale,
        scale_y: scale,
        time: appIcon._animConfig.timing,
        transition: appIcon._animConfig.easing,
      });
    }
  }
};
