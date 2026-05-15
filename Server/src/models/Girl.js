import mongoose from 'mongoose';

const girlProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 18 },
    bio: { type: String, default: '', maxlength: 500 },
    region: { type: String, default: 'Global' },
    language: { type: String, default: 'English' },
    photos: [{ type: String }],
    videoUrl: { type: String, default: '' },
    charmLevel: { type: String, enum: ['Rising', 'Hot', 'Goddess'], default: 'Rising' },
    distanceKm: { type: Number, default: 0 },
    location: { type: String, default: '' },

    // Registration auto-messages
    firstMessages: [
      {
        type: { type: String, enum: ['text', 'text+photo'], default: 'text' },
        content: { type: String, default: '' },
        photoUrl: { type: String, default: '' },
      },
    ],

    // Aggregated gifts received
    gifts: [
      {
        giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift' },
        giftName: { type: String, default: '' },
        giftIconUrl: { type: String, default: '' },
        emojiFallback: { type: String, default: '' },
        count: { type: Number, default: 0 },
      },
    ],

    relationshipFeatureEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
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

girlProfileSchema.index({ isActive: 1 });
girlProfileSchema.index({ region: 1 });
girlProfileSchema.index({ language: 1 });
girlProfileSchema.index({ charmLevel: -1 });

const GirlProfile = mongoose.model('GirlProfile', girlProfileSchema);
export default GirlProfile;
