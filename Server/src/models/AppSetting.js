import mongoose from 'mongoose';

const appSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    group: {
      type: String,
      enum: ['general', 'coins', 'calls', 'vip', 'branding', 'chat'],
      default: 'general',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const AppSetting = mongoose.model('AppSetting', appSettingSchema);

export default AppSetting;
